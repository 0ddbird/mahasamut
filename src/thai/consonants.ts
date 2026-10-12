/**
 * Thai consonants and their tone class.
 *
 * The Thai alphabet has 44 consonants. Each one belongs to one of three
 * classes — mid (9), high (11) and low (24) — and that class is the first
 * input of the tone rules: the same vowel, final and tone mark give a
 * different tone depending on the class of the initial consonant.
 *
 * Two of the 44 are obsolete: ฃ (kho khuat, high) and ฅ (kho khon, low).
 * They are still part of the alphabet, but no modern word is spelled with
 * them (ข and ค replaced them), so this table leaves them out and keeps 42
 * consonants: 9 mid, 10 high, 23 low.
 */
import { CONSONANT_CLASS } from './types';
import type { ConsonantClass } from './types';

/** A consonant letter and the tone class it belongs to. */
export interface Consonant {
  /** The letter itself, a single Unicode character (e.g. 'ก'). */
  char: string;
  consonantClass: ConsonantClass;
}

const MID_CONSONANTS: readonly Consonant[] = [
  { char: 'ก', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'จ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ฎ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ฏ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ด', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ต', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'บ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ป', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'อ', consonantClass: CONSONANT_CLASS.Mid },
];

const HIGH_CONSONANTS: readonly Consonant[] = [
  { char: 'ข', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฉ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฐ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ถ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ผ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฝ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ศ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ษ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ส', consonantClass: CONSONANT_CLASS.High },
  { char: 'ห', consonantClass: CONSONANT_CLASS.High },
];

const LOW_CONSONANTS: readonly Consonant[] = [
  { char: 'ค', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฆ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ง', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ช', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ซ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฌ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ญ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฑ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฒ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ณ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ท', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ธ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'น', consonantClass: CONSONANT_CLASS.Low },
  { char: 'พ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฟ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ภ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ม', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ย', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ร', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ล', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ว', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฬ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฮ', consonantClass: CONSONANT_CLASS.Low },
];

/** All 42 supported consonants, mid first, then high, then low. */
export const CONSONANTS: readonly Consonant[] = [
  ...MID_CONSONANTS,
  ...HIGH_CONSONANTS,
  ...LOW_CONSONANTS,
];

const BY_CHAR = new Map(CONSONANTS.map((c) => [c.char, c]));

/**
 * Looks up a consonant by its letter.
 *
 * @throws if `char` is not one of the 42 supported consonants — including
 *   the obsolete ฃ and ฅ, vowels and non-Thai characters.
 */
export function consonant(char: string): Consonant {
  const found = BY_CHAR.get(char);
  if (!found) throw new Error(`Unknown consonant: ${JSON.stringify(char)}`);
  return found;
}
