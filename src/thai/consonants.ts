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
import type { ConsonantClass } from './types';

/** A consonant letter and the tone class it belongs to. */
export interface Consonant {
  /** The letter itself, a single Unicode character (e.g. 'ก'). */
  char: string;
  consonantClass: ConsonantClass;
}

const MID_CONSONANTS: readonly Consonant[] = [
  { char: 'ก', consonantClass: 'mid' },
  { char: 'จ', consonantClass: 'mid' },
  { char: 'ฎ', consonantClass: 'mid' },
  { char: 'ฏ', consonantClass: 'mid' },
  { char: 'ด', consonantClass: 'mid' },
  { char: 'ต', consonantClass: 'mid' },
  { char: 'บ', consonantClass: 'mid' },
  { char: 'ป', consonantClass: 'mid' },
  { char: 'อ', consonantClass: 'mid' },
];

const HIGH_CONSONANTS: readonly Consonant[] = [
  { char: 'ข', consonantClass: 'high' },
  { char: 'ฉ', consonantClass: 'high' },
  { char: 'ฐ', consonantClass: 'high' },
  { char: 'ถ', consonantClass: 'high' },
  { char: 'ผ', consonantClass: 'high' },
  { char: 'ฝ', consonantClass: 'high' },
  { char: 'ศ', consonantClass: 'high' },
  { char: 'ษ', consonantClass: 'high' },
  { char: 'ส', consonantClass: 'high' },
  { char: 'ห', consonantClass: 'high' },
];

const LOW_CONSONANTS: readonly Consonant[] = [
  { char: 'ค', consonantClass: 'low' },
  { char: 'ฆ', consonantClass: 'low' },
  { char: 'ง', consonantClass: 'low' },
  { char: 'ช', consonantClass: 'low' },
  { char: 'ซ', consonantClass: 'low' },
  { char: 'ฌ', consonantClass: 'low' },
  { char: 'ญ', consonantClass: 'low' },
  { char: 'ฑ', consonantClass: 'low' },
  { char: 'ฒ', consonantClass: 'low' },
  { char: 'ณ', consonantClass: 'low' },
  { char: 'ท', consonantClass: 'low' },
  { char: 'ธ', consonantClass: 'low' },
  { char: 'น', consonantClass: 'low' },
  { char: 'พ', consonantClass: 'low' },
  { char: 'ฟ', consonantClass: 'low' },
  { char: 'ภ', consonantClass: 'low' },
  { char: 'ม', consonantClass: 'low' },
  { char: 'ย', consonantClass: 'low' },
  { char: 'ร', consonantClass: 'low' },
  { char: 'ล', consonantClass: 'low' },
  { char: 'ว', consonantClass: 'low' },
  { char: 'ฬ', consonantClass: 'low' },
  { char: 'ฮ', consonantClass: 'low' },
];

/** All 42 supported consonants, mid first, then high, then low. */
export const CONSONANTS: readonly Consonant[] = [...MID_CONSONANTS, ...HIGH_CONSONANTS, ...LOW_CONSONANTS];

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
