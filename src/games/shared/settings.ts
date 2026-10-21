/**
 * The settings of a game, chosen before it starts. Three settings combine
 * freely: the length (endless, or a series of questions), the time (free, or a
 * time per question) and, in the syllable game, the answer (the full reasoning, or
 * the tone alone).
 *
 * The defaults are the game as it was before settings existed, so a regular
 * player only has to click Play. A multiplayer room uses the same settings,
 * with fewer combinations allowed.
 */

/** How long a question can last, in whole seconds, and the time first proposed. */
export const SECONDS_PER_QUESTION = { min: 1, max: 60, default: 15 } as const;

/** How many questions a series can have, and the number first proposed. */
export const QUESTION_COUNT = { min: 5, max: 30, default: 10 } as const;

/**
 * What the player answers in the syllable game: every step of the reasoning (class,
 * mark, vowel length, final, live or dead, tone), or the tone alone.
 */
export const ANSWER_MODE = {
  Detailed: 'detailed',
  ToneOnly: 'toneOnly',
} as const;
export type AnswerMode = (typeof ANSWER_MODE)[keyof typeof ANSWER_MODE];
export const ANSWER_MODES: readonly AnswerMode[] = Object.values(ANSWER_MODE);

export interface GameSettings {
  /** The length of a series; null for an endless game. */
  questionCount: number | null;
  /** The time given for each question, in seconds; null for free time. */
  secondsPerQuestion: number | null;
  /** Only read by the syllable game. */
  answerMode: AnswerMode;
  /**
   * Whether the game's help panels can be opened while playing; each game has
   * its own. They give part of the answer away: for learning, alone only.
   */
  learningMode: boolean;
}

/** Endless, free time, full reasoning, no help: the game as it was before settings. */
export const DEFAULT_SETTINGS: GameSettings = {
  questionCount: null,
  secondsPerQuestion: null,
  answerMode: ANSWER_MODE.Detailed,
  learningMode: false,
};

/** Whether `value` is a whole number from `range.min` to `range.max`. */
export const isWholeIn = (value: unknown, range: { min: number; max: number }) =>
  Number.isInteger(value) && (value as number) >= range.min && (value as number) <= range.max;

/**
 * Reads settings that may come from anywhere (storage, the URL): each value
 * the game does not accept is replaced by its default, the others are kept.
 */
export function parseGameSettings(raw: unknown): GameSettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return DEFAULT_SETTINGS;
  const { questionCount, secondsPerQuestion, answerMode, learningMode } = raw as Record<
    string,
    unknown
  >;

  const countInRange = isWholeIn(questionCount, QUESTION_COUNT);
  const timeInRange = isWholeIn(secondsPerQuestion, SECONDS_PER_QUESTION);
  const knownMode = ANSWER_MODES.includes(answerMode as AnswerMode);

  return {
    questionCount: countInRange ? (questionCount as number) : DEFAULT_SETTINGS.questionCount,
    secondsPerQuestion: timeInRange
      ? (secondsPerQuestion as number)
      : DEFAULT_SETTINGS.secondsPerQuestion,
    answerMode: knownMode ? (answerMode as AnswerMode) : DEFAULT_SETTINGS.answerMode,
    learningMode: typeof learningMode === 'boolean' ? learningMode : DEFAULT_SETTINGS.learningMode,
  };
}

/** Playing alone, or with others in a room. */
export const PLAY_MODE = {
  Solo: 'solo',
  Multi: 'multi',
} as const;
export type PlayMode = (typeof PLAY_MODE)[keyof typeof PLAY_MODE];

/**
 * Whether a game can be played with these settings in `mode`. Every
 * combination works alone. A room needs an end, for its podium, and a timer,
 * so that a slow player never holds the others back; the help panels would give
 * answers away in a ranking, so a room has none.
 */
export function isAllowed(settings: GameSettings, mode: PlayMode): boolean {
  if (mode === PLAY_MODE.Solo) return true;
  return (
    settings.questionCount !== null &&
    settings.secondsPerQuestion !== null &&
    !settings.learningMode
  );
}
