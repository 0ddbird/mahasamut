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
 * consonants: 9 mid, 10 high, 23 low. Each class has its own file:
 * mid.ts, high.ts and low.ts. Final consonants are handled in finals.ts.
 */
import type { ConsonantClass } from '../types';
import { HIGH_CONSONANTS } from './high';
import { LOW_CONSONANTS } from './low';
import { MID_CONSONANTS } from './mid';

/** A consonant letter and the tone class it belongs to. */
export interface Consonant {
  /** The letter itself, a single Unicode character (e.g. 'ก'). */
  char: string;
  consonantClass: ConsonantClass;
}

export { HIGH_CONSONANTS, LOW_CONSONANTS, MID_CONSONANTS };

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
