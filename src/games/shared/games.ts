/**
 * The games of the site, named in the code by what they are about. Their
 * displayed names live here only: the rest of the code and the tests read them
 * from GAME_NAMES, so that a game can be renamed in one place.
 *
 * In the order the site lists them, from the letters to the syllable: the
 * consonant classes and the vowels come first, since the tone of a syllable
 * starts from them.
 */
export const GAME = {
  /** Read a consonant and find its class. */
  ConsonantClass: 'consonantClass',
  /** Read a vowel and find how it sounds. */
  Vowel: 'vowel',
  /** Read a syllable and find its tone, step by step. */
  Syllable: 'syllable',
} as const;
export type GameId = (typeof GAME)[keyof typeof GAME];
export const GAME_IDS: readonly GameId[] = Object.values(GAME);

/** The name of each game, as the site shows it. */
export const GAME_NAMES: Record<GameId, string> = {
  [GAME.Syllable]: 'Find the tone',
  [GAME.ConsonantClass]: 'Consonant classes',
  [GAME.Vowel]: 'Vowel sounds',
};

/** A sample of the Thai text each game shows, for its tile on the home page. */
export const GAME_SAMPLES: Record<GameId, string> = {
  [GAME.Syllable]: 'ก่า',
  [GAME.ConsonantClass]: 'ข',
  [GAME.Vowel]: 'เอีย',
};

/** Where each game is served. */
export const GAME_PATHS: Record<GameId, string> = {
  [GAME.Syllable]: '/syllable',
  [GAME.ConsonantClass]: '/consonant-class',
  [GAME.Vowel]: '/vowel',
};
