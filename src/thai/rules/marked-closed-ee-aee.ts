/**
 * Rule 7: the long vowels เ- (ee) and แ- (aee) never take both a final and a
 * tone mark.
 *
 * Before a final, the short vowels เ-ะ and แ-ะ are written เ-็ and แ-็, but a
 * tone mark replaces their ็ (เล่น, แข่ง). They are then written exactly like
 * the long ones: เก่น could be long or short, and is read as short.
 */
import type { SyllableParts } from '../render';
import { TONE_MARK, VOWEL } from '../types';

/** Rejects a closed เ- or แ- with a tone mark. */
export function markedClosedEeAee({
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): string | null {
  const longEeOrAee = vowel.id === VOWEL.Ee || vowel.id === VOWEL.Aee;
  const closedWithMark = final !== null && mark !== TONE_MARK.None;
  if (longEeOrAee && closedWithMark) {
    return `Vowel ${vowel.id} closed with a tone mark would read as short`;
  }
  return null;
}
