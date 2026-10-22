/**
 * A multiplayer room, from its creation in the lobby to the final podium.
 *
 * Pure state machine with no timers and no network: the caller passes the
 * current timestamp (`now`) to every method.
 */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { isAvatarId, pickRandomAvatar } from '../src/multiplayer/avatars';
import type { AvatarId } from '../src/multiplayer/avatars';
import type {
  ActionError,
  GameAnswer,
  PhaseView,
  RankingEntry,
  RoomView,
  RoundResultView,
} from '../src/multiplayer/protocol';
import { pseudoKey } from '../src/multiplayer/pseudo';
import { parseLobbySettings } from '../src/multiplayer/settings';
import type { RoomSettings } from '../src/multiplayer/settings';
import type { Rng } from '../src/thai/generator';
import { SERVER_GAMES } from './games';
import type { ServerQuestion } from './games/types';
import { MAX_PLAYERS_PER_ROOM } from './limits';
import { questionPoints, rankPlayers } from './scoring';

export type JoinError = 'started' | 'room-full' | 'wrong-password' | 'pseudo-taken';
export type Outcome<E> = { ok: true } | { ok: false; error: E };

interface Player {
  token: string;
  pseudo: string;
  key: string;
  avatar: AvatarId;
  isHost: boolean;
  connections: number;
  left: boolean;
  score: number;
}

interface SubmittedAnswer {
  answer: GameAnswer;
  receivedAt: number;
}

type InternalPhase =
  | { kind: 'lobby' }
  | {
      kind: 'question';
      index: number;
      openedAt: number;
      deadline: number;
      submissions: Map<string, SubmittedAnswer>;
    }
  | {
      kind: 'results';
      index: number;
      results: Map<string, RoundResultView>;
    }
  | { kind: 'finished' };

function samePassword(expected: string, given: string | null): boolean {
  if (given === null) return false;
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(given).digest();
  return timingSafeEqual(a, b);
}

export class Room {
  readonly id: string;
  private currentSettings: RoomSettings;
  private readonly rng: Rng;
  private readonly players: Player[] = [];
  private readonly byToken = new Map<string, Player>();
  private questions: ServerQuestion[] = [];
  private phase: InternalPhase = { kind: 'lobby' };
  private activityAt: number;

  private constructor(id: string, settings: RoomSettings, now: number, rng: Rng) {
    this.id = id;
    this.currentSettings = settings;
    this.activityAt = now;
    this.rng = rng;
  }

  get settings(): RoomSettings {
    return this.currentSettings;
  }

  static create(
    id: string,
    settings: RoomSettings,
    hostPseudo: string,
    now: number,
    rng: Rng = Math.random,
  ): { room: Room; token: string } {
    const room = new Room(id, settings, now, rng);
    const token = randomUUID();
    const host: Player = {
      token,
      pseudo: hostPseudo,
      key: pseudoKey(hostPseudo),
      avatar: pickRandomAvatar(Math.random),
      isHost: true,
      connections: 0,
      left: false,
      score: 0,
    };
    room.players.push(host);
    room.byToken.set(token, host);
    return { room, token };
  }

  get lastActivity(): number {
    return this.activityAt;
  }

  get deadline(): number | null {
    return this.phase.kind === 'question' ? this.phase.deadline : null;
  }

  get status(): 'open' | 'started' | 'full' {
    if (this.phase.kind !== 'lobby') return 'started';
    if (this.activePlayers().length >= MAX_PLAYERS_PER_ROOM) return 'full';
    return 'open';
  }

  hasPlayer(token: string): boolean {
    return this.byToken.has(token);
  }

  private activePlayers(): Player[] {
    return this.players.filter((p) => !p.left);
  }

  join(
    pseudo: string,
    password: string | null,
    now: number,
  ): { ok: true; token: string } | { ok: false; error: JoinError } {
    if (this.phase.kind !== 'lobby') return { ok: false, error: 'started' };
    const active = this.activePlayers();
    if (active.length >= MAX_PLAYERS_PER_ROOM) return { ok: false, error: 'room-full' };
    if (this.settings.password !== null && !samePassword(this.settings.password, password)) {
      return { ok: false, error: 'wrong-password' };
    }
    const key = pseudoKey(pseudo);
    if (active.some((p) => p.key === key)) {
      return { ok: false, error: 'pseudo-taken' };
    }

    // Remove any disconnected player who previously held the same pseudo key.
    for (let i = this.players.length - 1; i >= 0; i--) {
      const p = this.players[i];
      if (p.left && p.key === key) {
        this.players.splice(i, 1);
        this.byToken.delete(p.token);
      }
    }

    const token = randomUUID();
    const player: Player = {
      token,
      pseudo,
      key,
      avatar: pickRandomAvatar(
        Math.random,
        active.map((p) => p.avatar),
      ),
      isHost: false,
      connections: 0,
      left: false,
      score: 0,
    };
    this.players.push(player);
    this.byToken.set(token, player);
    this.activityAt = now;
    return { ok: true, token };
  }

  connect(token: string, now: number): boolean {
    const player = this.byToken.get(token);
    if (!player) return false;
    player.connections += 1;
    player.left = false;
    this.activityAt = now;
    return true;
  }

  disconnect(token: string, now: number): void {
    const player = this.byToken.get(token);
    if (!player) return;
    player.connections = Math.max(0, player.connections - 1);
    if (player.connections === 0) {
      player.left = true;
    }
    this.activityAt = now;
    this.closeIfEveryoneAnswered();
  }

  leave(token: string, now: number): void {
    const player = this.byToken.get(token);
    if (!player) return;
    this.byToken.delete(token);
    const idx = this.players.indexOf(player);
    if (idx !== -1) {
      this.players.splice(idx, 1);
    }
    if (player.isHost && this.players.length > 0) {
      const nextHost = this.activePlayers()[0] ?? this.players[0];
      nextHost.isHost = true;
    }
    this.activityAt = now;
    this.closeIfEveryoneAnswered();
  }

  setAvatar(token: string, raw: unknown, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (this.phase.kind !== 'lobby') return { ok: false, error: 'wrong-phase' };
    if (!isAvatarId(raw)) return { ok: false, error: 'invalid-avatar' };
    player.avatar = raw;
    this.activityAt = now;
    return { ok: true };
  }

  updateSettings(token: string, raw: unknown, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (!player.isHost) return { ok: false, error: 'not-host' };
    if (this.phase.kind !== 'lobby') return { ok: false, error: 'wrong-phase' };
    const parsed = parseLobbySettings(raw);
    if (!parsed) return { ok: false, error: 'invalid-settings' };
    this.currentSettings = {
      ...parsed,
      password: this.currentSettings.password,
    };
    this.activityAt = now;
    return { ok: true };
  }

  returnToLobby(token: string, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (!player.isHost) return { ok: false, error: 'not-host' };
    if (this.phase.kind !== 'finished') return { ok: false, error: 'wrong-phase' };
    for (const p of this.players) {
      p.score = 0;
    }
    this.questions = [];
    this.phase = { kind: 'lobby' };
    this.activityAt = now;
    return { ok: true };
  }

  start(token: string, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (!player.isHost) return { ok: false, error: 'not-host' };
    if (this.phase.kind !== 'lobby') return { ok: false, error: 'wrong-phase' };

    this.questions = SERVER_GAMES[this.settings.game].drawQuestions(this.settings, this.rng);
    this.openQuestion(0, now);
    this.activityAt = now;
    return { ok: true };
  }

  answer(token: string, raw: unknown, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (this.phase.kind !== 'question') return { ok: false, error: 'wrong-phase' };
    if (now >= this.phase.deadline) {
      this.closeQuestion();
      return { ok: false, error: 'too-late' };
    }
    if (this.phase.submissions.has(token)) {
      return { ok: false, error: 'already-answered' };
    }
    const parsed = SERVER_GAMES[this.settings.game].parseAnswer(raw, this.settings);
    if (!parsed) return { ok: false, error: 'invalid-answer' };

    this.phase.submissions.set(token, { answer: parsed, receivedAt: now });
    this.activityAt = now;
    this.closeIfEveryoneAnswered();
    return { ok: true };
  }

  expire(now: number): boolean {
    if (this.phase.kind !== 'question') return false;
    if (now < this.phase.deadline) return false;
    this.closeQuestion();
    return true;
  }

  next(token: string, now: number): Outcome<ActionError> {
    const player = this.byToken.get(token);
    if (!player) return { ok: false, error: 'not-in-room' };
    if (!player.isHost) return { ok: false, error: 'not-host' };
    if (this.phase.kind !== 'results') return { ok: false, error: 'wrong-phase' };

    this.activityAt = now;
    const nextIndex = this.phase.index + 1;
    if (nextIndex >= this.questions.length) {
      this.phase = { kind: 'finished' };
    } else {
      this.openQuestion(nextIndex, now);
    }
    return { ok: true };
  }

  viewFor(token: string, now: number): RoomView {
    const you = this.byToken.get(token) ?? this.players[0];
    const host = this.players.find((p) => p.isHost) ?? this.players[0];
    return {
      roomId: this.id,
      game: this.settings.game,
      settings: {
        secondsPerQuestion: this.settings.secondsPerQuestion,
        questionCount: this.settings.questionCount,
        answerMode: this.settings.answerMode,
        hasPassword: this.settings.password !== null,
      },
      you: { pseudo: you.pseudo, avatar: you.avatar, isHost: you.isHost },
      host: { pseudo: host.pseudo, connected: host.connections > 0 },
      players: this.activePlayers().map((p) => ({
        pseudo: p.pseudo,
        avatar: p.avatar,
        isHost: p.isHost,
        connected: p.connections > 0,
      })),
      phase: this.phaseViewFor(you.token, now),
    };
  }

  private openQuestion(index: number, now: number): void {
    this.phase = {
      kind: 'question',
      index,
      openedAt: now,
      deadline: now + this.settings.secondsPerQuestion * 1000,
      submissions: new Map(),
    };
  }

  private closeIfEveryoneAnswered(): void {
    if (this.phase.kind !== 'question') return;
    const connected = this.players.filter((p) => p.connections > 0);
    if (connected.length === 0) return;
    const submissions = this.phase.submissions;
    if (connected.every((p) => submissions.has(p.token))) {
      this.closeQuestion();
    }
  }

  private closeQuestion(): void {
    if (this.phase.kind !== 'question') return;
    const { index, openedAt, submissions } = this.phase;
    const question = this.questions[index];
    const totalMs = this.settings.secondsPerQuestion * 1000;
    const results = new Map<string, RoundResultView>();

    for (const player of this.players) {
      const sub = submissions.get(player.token);
      if (!sub) {
        results.set(player.token, { answer: null, correct: false, points: 0 });
        continue;
      }
      const correct = question.isCorrect(sub.answer);
      const points = questionPoints(correct, sub.receivedAt - openedAt, totalMs);
      player.score += points;
      results.set(player.token, { answer: sub.answer, correct, points });
    }

    this.phase = { kind: 'results', index, results };
  }

  private rankingFor(youToken: string): RankingEntry[] {
    const you = this.byToken.get(youToken);
    const byPseudo = new Map(this.players.map((p) => [p.pseudo, p]));
    return rankPlayers(this.players).map((entry) => ({
      ...entry,
      avatar: byPseudo.get(entry.pseudo)!.avatar,
      isYou: entry.pseudo === you?.pseudo,
    }));
  }

  private phaseViewFor(token: string, now: number): PhaseView {
    if (this.phase.kind === 'lobby') return { kind: 'lobby' };
    if (this.phase.kind === 'question') {
      const q = this.questions[this.phase.index];
      const submission = this.phase.submissions.get(token);
      return {
        kind: 'question',
        index: this.phase.index,
        question: q.view,
        remainingMs: Math.max(0, this.phase.deadline - now),
        yourAnswer: submission ? submission.answer : null,
        answeredCount: this.phase.submissions.size,
        connectedCount: this.players.filter((p) => p.connections > 0).length,
      };
    }
    if (this.phase.kind === 'results') {
      const q = this.questions[this.phase.index];
      return {
        kind: 'results',
        index: this.phase.index,
        question: q.view,
        reveal: q.reveal,
        you: this.phase.results.get(token) ?? { answer: null, correct: false, points: 0 },
        ranking: this.rankingFor(token),
        isLast: this.phase.index === this.questions.length - 1,
      };
    }
    return {
      kind: 'finished',
      ranking: this.rankingFor(token),
    };
  }
}
