/**
 * The games of the site, named in the code by what they are about. Their
 * displayed names are not settled yet, so they live here only: the rest of
 * the code and the tests read them from GAME_NAMES and GAME_THAI_NAMES.
 */
export const GAME = {
  /** Read a syllable and find its tone, step by step. */
  Syllable: 'syllable',
  /** Read a consonant and find its class. */
  ConsonantClass: 'consonantClass',
} as const;
export type GameId = (typeof GAME)[keyof typeof GAME];
export const GAME_IDS: readonly GameId[] = Object.values(GAME);

/** The name of each game, as the site shows it. */
export const GAME_NAMES: Record<GameId, string> = {
  [GAME.Syllable]: 'Wannayuk',
  [GAME.ConsonantClass]: 'Akson sam mu',
};

/** Where each game is served. */
export const GAME_PATHS: Record<GameId, string> = {
  [GAME.Syllable]: '/syllable',
  [GAME.ConsonantClass]: '/consonant-class',
};

/** The Thai name each game is named after, shown next to it. */
export const GAME_THAI_NAMES: Record<GameId, string> = {
  [GAME.Syllable]: 'วรรณยุกต์',
  [GAME.ConsonantClass]: 'อักษรสามหมู่',
};
