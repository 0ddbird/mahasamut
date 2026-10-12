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

/**
 * The eight sounds a syllable can end on. Whatever the written letter, a
 * final consonant is pronounced as one of these: stops (k, t, p) or sonorants
 * (m, n, ng, y, w).
 */
export const FINAL_SOUND = {
  K: 'k',
  T: 't',
  P: 'p',
  M: 'm',
  N: 'n',
  Ng: 'ng',
  Y: 'y',
  W: 'w',
} as const;
export type FinalSound = (typeof FINAL_SOUND)[keyof typeof FINAL_SOUND];
export const FINAL_SOUNDS: readonly FinalSound[] = Object.values(FINAL_SOUND);

/** How a syllable ends: no final sound, a sonorant final, or a stop final. */
export const FINAL_KIND = {
  None: 'none',
  Sonorant: 'sonorant',
  Stop: 'stop',
} as const;
export type FinalKind = (typeof FINAL_KIND)[keyof typeof FINAL_KIND];
export const FINAL_KINDS: readonly FinalKind[] = Object.values(FINAL_KIND);

/**
 * Vowels, named by a phonetic romanization where a doubled letter means a
 * long vowel. The 24 simple vowels come first, each short vowel right before
 * its long pair; `or` / `oor` are the open o (ɔ), `oe` / `oee` the unrounded ɤ.
 * The 4 sara koen follow; ใ and ไ sound the same and are named after their
 * letter (mai muan, mai malai).
 */
export const VOWEL = {
  A: 'a',
  Aa: 'aa',
  I: 'i',
  Ii: 'ii',
  Ue: 'ue',
  Uee: 'uee',
  U: 'u',
  Uu: 'uu',
  E: 'e',
  Ee: 'ee',
  Ae: 'ae',
  Aee: 'aee',
  O: 'o',
  Oo: 'oo',
  Or: 'or',
  Oor: 'oor',
  Oe: 'oe',
  Oee: 'oee',
  Ia: 'ia',
  Iia: 'iia',
  Uea: 'uea',
  Ueea: 'ueea',
  Ua: 'ua',
  Uua: 'uua',
  // Sara koen: short vowels that end with a built-in final sound.
  Am: 'am',
  AiMuan: 'ai_muan',
  AiMalai: 'ai_malai',
  Ao: 'ao',
} as const;
export type VowelId = (typeof VOWEL)[keyof typeof VOWEL];
export const VOWEL_IDS: readonly VowelId[] = Object.values(VOWEL);

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
