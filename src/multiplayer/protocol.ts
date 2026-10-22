/**
 * The contract between the browser and the room server: the Socket.IO events
 * and the view of a room each player receives.
 *
 * A question view carries only what is shown while the question is open, never
 * the expected answers (`Reveal`).
 */
import type { GameId } from '../games/shared/games';
import type { AnswerMode } from '../games/shared/settings';
import type { PlayerAnswers } from '../games/syllable/check';
import type { SyllableAnswers } from '../thai/answers';
import type { ConsonantClass, ToneMark, VowelId } from '../thai/types';
import type { AvatarId } from './avatars';

export type QuestionView =
  | { game: 'syllable'; text: string }
  | { game: 'consonantClass'; text: string }
  | { game: 'vowel'; text: string; choices: readonly string[] };

export type GameAnswer =
  | { game: 'syllable'; answers: PlayerAnswers }
  | { game: 'consonantClass'; consonantClass: ConsonantClass }
  | { game: 'vowel'; sound: string };

export type Reveal =
  | { game: 'syllable'; analyses: readonly SyllableAnswers[]; mark: ToneMark }
  | { game: 'consonantClass'; consonantClass: ConsonantClass }
  | { game: 'vowel'; vowelId: VowelId; expected: string };

export interface RankingEntry {
  rank: number;
  pseudo: string;
  avatar: AvatarId;
  score: number;
  isYou: boolean;
}

export interface PlayerView {
  pseudo: string;
  avatar: AvatarId;
  isHost: boolean;
  connected: boolean;
}

export interface RoundResultView {
  answer: GameAnswer | null;
  correct: boolean;
  points: number;
}

export type PhaseView =
  | { kind: 'lobby' }
  | {
      kind: 'question';
      index: number;
      question: QuestionView;
      remainingMs: number;
      yourAnswer: GameAnswer | null;
      answeredCount: number;
      connectedCount: number;
    }
  | {
      kind: 'results';
      index: number;
      question: QuestionView;
      reveal: Reveal;
      you: RoundResultView;
      ranking: RankingEntry[];
      isLast: boolean;
    }
  | { kind: 'finished'; ranking: RankingEntry[] };

export interface RoomView {
  roomId: string;
  game: GameId;
  settings: {
    secondsPerQuestion: number;
    questionCount: number;
    answerMode: AnswerMode;
    hasPassword: boolean;
  };
  you: { pseudo: string; avatar: AvatarId; isHost: boolean };
  host: { pseudo: string; connected: boolean };
  players: PlayerView[];
  phase: PhaseView;
}

export type CreateRoomError = 'invalid-settings' | 'invalid-pseudo' | 'server-full';
export type JoinRoomError =
  | 'not-found'
  | 'started'
  | 'room-full'
  | 'wrong-password'
  | 'too-many-attempts'
  | 'invalid-pseudo'
  | 'pseudo-taken';
export type ResumeError = 'not-found' | 'unknown-token';
export type ActionError =
  | 'not-in-room'
  | 'not-host'
  | 'wrong-phase'
  | 'invalid-avatar'
  | 'invalid-settings'
  | 'invalid-answer'
  | 'already-answered'
  | 'too-late';

export type Ack<E, T = object> = ({ ok: true } & T) | { ok: false; error: E };

export interface ClientToServerEvents {
  'room:create': (
    req: { settings: unknown; pseudo: unknown },
    ack: (res: Ack<CreateRoomError, { roomId: string; token: string }>) => void,
  ) => void;
  'room:info': (
    req: { roomId: unknown },
    ack: (
      res: Ack<
        'not-found',
        { game: GameId; hasPassword: boolean; status: 'open' | 'started' | 'full' }
      >,
    ) => void,
  ) => void;
  'room:join': (
    req: { roomId: unknown; pseudo: unknown; password: unknown },
    ack: (res: Ack<JoinRoomError, { token: string }>) => void,
  ) => void;
  'room:resume': (
    req: { roomId: unknown; token: unknown },
    ack: (res: Ack<ResumeError>) => void,
  ) => void;
  'room:avatar': (avatar: unknown, ack: (res: Ack<ActionError>) => void) => void;
  'room:settings': (settings: unknown, ack: (res: Ack<ActionError>) => void) => void;
  'game:start': (ack: (res: Ack<ActionError>) => void) => void;
  'game:answer': (answer: unknown, ack: (res: Ack<ActionError>) => void) => void;
  'game:next': (ack: (res: Ack<ActionError>) => void) => void;
  'game:lobby': (ack: (res: Ack<ActionError>) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:closed': () => void;
}
