/**
 * Rule 4: the invisible o never takes a ร ว ย final. A consonant followed by ร
 * alone reads with a long ɔ and a final n (พร and จร read like พอน and จอน),
 * and ว ย only close the written vowels of rule 3.
 *
 * @see https://en.wikipedia.org/wiki/Thai_script (vowels table, ◌ร)
 */
import type { SyllableParts } from '../render';
import { VOWEL } from '../types';

/** Finals never written after the invisible o. */
const FINALS_NOT_AFTER_INVISIBLE_O: readonly string[] = ['ร', 'ว', 'ย'];

/** Rejects a ร ว ย final after the invisible o. */
export function invisibleOFinals({ vowel, final = null }: SyllableParts): string | null {
  if (vowel.id !== VOWEL.O || final === null) return null;
  if (!FINALS_NOT_AFTER_INVISIBLE_O.includes(final)) return null;
  return `Final ${final} cannot follow the invisible o`;
}
