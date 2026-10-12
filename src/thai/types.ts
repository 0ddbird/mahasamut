/**
 * Shared Thai types.
 *
 * Each set of values is a `const` object used like an enum (e.g. `TONE.Low`).
 * The matching type is derived from it, and so is a list of its values for
 * runtime use (e.g. picking one at random or rendering one button per value).
 * Adding a value to an object updates its type and its list automatically.
 */

/** Tone classes of a consonant. The class decides which row of the tone rules applies. */
export const CONSONANT_CLASS = {
  High: 'high',
  Mid: 'mid',
  Low: 'low',
} as const;
export type ConsonantClass = (typeof CONSONANT_CLASS)[keyof typeof CONSONANT_CLASS];
export const CONSONANT_CLASSES: readonly ConsonantClass[] = Object.values(CONSONANT_CLASS);

/** Lengths of the written vowel. */
export const VOWEL_LENGTH = {
  Short: 'short',
  Long: 'long',
} as const;
export type VowelLength = (typeof VOWEL_LENGTH)[keyof typeof VOWEL_LENGTH];
export const VOWEL_LENGTHS: readonly VowelLength[] = Object.values(VOWEL_LENGTH);

/**
 * Live syllables (คำเป็น) end in a long vowel or a sonorant final
 * (m, n, ng, y, w); dead syllables (คำตาย) end in a short vowel or a stop
 * final (k, t, p).
 */
export const LIVENESS = {
  Live: 'live',
  Dead: 'dead',
} as const;
export type Liveness = (typeof LIVENESS)[keyof typeof LIVENESS];
export const LIVENESSES: readonly Liveness[] = Object.values(LIVENESS);

/**
 * Tone marks written above the syllable: ่ (eek), ้ (thoo), ๊ (trii) and
 * ๋ (djattawaa). `None` means the syllable has no tone mark.
 */
export const TONE_MARK = {
  None: 'none',
  Eek: 'eek',
  Thoo: 'thoo',
  Trii: 'trii',
  Djattawaa: 'djattawaa',
} as const;
export type ToneMark = (typeof TONE_MARK)[keyof typeof TONE_MARK];
export const TONE_MARKS: readonly ToneMark[] = Object.values(TONE_MARK);

/** The five Thai tones. */
export const TONE = {
  Mid: 'mid',
  Low: 'low',
  Falling: 'falling',
  High: 'high',
  Rising: 'rising',
} as const;
export type Tone = (typeof TONE)[keyof typeof TONE];
export const TONES: readonly Tone[] = Object.values(TONE);
