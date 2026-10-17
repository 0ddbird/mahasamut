/**
 * The settings of a room, chosen by its creator: the game, the time given for
 * each question, the number of questions, the answer mode (read by the syllable
 * game), and an optional password.
 *
 * The form that creates a room offers these values, and the server checks what
 * it receives against them: a client is never trusted.
 */
import { GAME_IDS } from '../games/shared/games';
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

export interface RoomSettings {
  game: GameId;
  secondsPerQuestion: number;
  questionCount: number;
  answerMode: AnswerMode;
  /** Null when the room is open to anyone with its link. */
  password: string | null;
}

/**
 * Reads settings sent by a client. A missing or empty password means none; a
 * missing answer mode defaults to full reasoning.
 *
 * @returns null if any value is not one the room accepts.
 */
export function parseRoomSettings(raw: unknown): RoomSettings | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { game, secondsPerQuestion, questionCount, answerMode, password } = raw as Record<
    string,
    unknown
  >;

  if (!GAME_IDS.includes(game as GameId)) return null;
  if (!isWholeIn(secondsPerQuestion, SECONDS_PER_QUESTION)) return null;
  if (!isWholeIn(questionCount, QUESTION_COUNT)) return null;

  const mode = answerMode === undefined ? ANSWER_MODE.Detailed : answerMode;
  if (!ANSWER_MODES.includes(mode as AnswerMode)) return null;

  if (password !== undefined && typeof password !== 'string') return null;
  if (password !== undefined && password.length > PASSWORD_MAX_LENGTH) return null;

  return {
    game: game as GameId,
    secondsPerQuestion: secondsPerQuestion as number,
    questionCount: questionCount as number,
    answerMode: mode as AnswerMode,
    password: password === undefined || password === '' ? null : password,
  };
}
