/**
 * The settings of a room: the game, the time given for each question, the
 * number of questions, the answer mode (read by the syllable game), and an
 * optional password chosen at creation.
 *
 * The host can adjust the game settings (`LobbySettings`) live from the lobby
 * before starting; the server validates every change.
 */
import { GAME, GAME_IDS } from '../games/shared/games';
import type { GameId } from '../games/shared/games';
import {
  ANSWER_MODE,
  ANSWER_MODES,
  isWholeIn,
  QUESTION_COUNT,
  SECONDS_PER_QUESTION,
} from '../games/shared/settings';
import type { AnswerMode } from '../games/shared/settings';

/** Long enough for a passphrase, short enough to type on a phone. */
export const PASSWORD_MAX_LENGTH = 64;

export interface LobbySettings {
  game: GameId;
  secondsPerQuestion: number;
  questionCount: number;
  answerMode: AnswerMode;
}

export interface RoomSettings extends LobbySettings {
  /** Null when the room is open to anyone with its link. */
  password: string | null;
}

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
  game: GAME.Syllable,
  secondsPerQuestion: SECONDS_PER_QUESTION.default,
  questionCount: QUESTION_COUNT.default,
  answerMode: ANSWER_MODE.Detailed,
};

/**
 * Validates game settings updated by the host in the lobby.
 */
export function parseLobbySettings(raw: unknown): LobbySettings | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { game, secondsPerQuestion, questionCount, answerMode } = raw as Record<string, unknown>;

  if (!GAME_IDS.includes(game as GameId)) return null;
  if (!isWholeIn(secondsPerQuestion, SECONDS_PER_QUESTION)) return null;
  if (!isWholeIn(questionCount, QUESTION_COUNT)) return null;

  const mode = answerMode === undefined ? ANSWER_MODE.Detailed : answerMode;
  if (!ANSWER_MODES.includes(mode as AnswerMode)) return null;

  return {
    game: game as GameId,
    secondsPerQuestion: secondsPerQuestion as number,
    questionCount: questionCount as number,
    answerMode: mode as AnswerMode,
  };
}

/**
 * Reads settings sent when creating a room. Missing game settings default to
 * `DEFAULT_LOBBY_SETTINGS`; a missing or empty password means none.
 *
 * @returns null if any value is not one the room accepts.
 */
export function parseRoomSettings(raw: unknown): RoomSettings | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const { password } = record;

  const lobby = parseLobbySettings({
    game: record.game ?? DEFAULT_LOBBY_SETTINGS.game,
    secondsPerQuestion: record.secondsPerQuestion ?? DEFAULT_LOBBY_SETTINGS.secondsPerQuestion,
    questionCount: record.questionCount ?? DEFAULT_LOBBY_SETTINGS.questionCount,
    answerMode: record.answerMode ?? DEFAULT_LOBBY_SETTINGS.answerMode,
  });
  if (!lobby) return null;

  if (password !== undefined && typeof password !== 'string') return null;
  if (password !== undefined && password.length > PASSWORD_MAX_LENGTH) return null;

  return {
    ...lobby,
    password: password === undefined || password === '' ? null : password,
  };
}
