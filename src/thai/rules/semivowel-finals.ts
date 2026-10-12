/**
 * Rule 3: a final ย or ว only follows the vowels it makes a common diphthong
 * with. Short a + /y/ is written ไ- or ใ-, and short a + /w/ is written เ-า.
 */
import type { SyllableParts } from '../render';
import { VOWEL } from '../types';
import type { VowelId } from '../types';

/**
 * Vowels a final ย or ว can follow. Together they make a diphthong: สาย, คุย,
 * ลอย, โดย, เลย, สวย, เหนื่อย with ย; ขาว, หิว, เร็ว, เลว, แมว, เขียว with ว.
 *
 * @see https://en.wikipedia.org/wiki/Royal_Thai_General_System_of_Transcription (vowels table)
 */
const VOWELS_BEFORE_SEMIVOWEL: ReadonlyMap<string, readonly VowelId[]> = new Map([
  ['ย', [VOWEL.Aa, VOWEL.U, VOWEL.Uu, VOWEL.Oor, VOWEL.Oo, VOWEL.Oee, VOWEL.Uua, VOWEL.Ueea]],
  ['ว', [VOWEL.Aa, VOWEL.I, VOWEL.E, VOWEL.Ee, VOWEL.Ae, VOWEL.Aee, VOWEL.Iia]],
]);

/** Rejects a final ย or ว after a vowel it does not make a diphthong with. */
export function semivowelFinals({ vowel, final = null }: SyllableParts): string | null {
  if (final === null) return null;
  const allowedVowels = VOWELS_BEFORE_SEMIVOWEL.get(final);
  if (allowedVowels === undefined || allowedVowels.includes(vowel.id)) return null;
  return `Final ${final} cannot follow vowel ${vowel.id}`;
}
