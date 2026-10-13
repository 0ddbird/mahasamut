/**
 * Rule 6: when the final is written right after the onset, with no vowel sign
 * or tone mark between them, the two must not form another onset.
 *
 * This happens with เ- แ- โ-, and with เ-อ before ย, written เ-. ก + เ- + ร is
 * written เกร, the spelling of the cluster กร + เ-; likewise โหม (หม + โ-),
 * แขว (ขว + แ-) and โอย (อย + โ-).
 *
 * Two cases need no rule, as no other combination is written the same way:
 * - a tone mark sits on the last consonant of the onset, so it tells the two
 *   readings apart (ข + เ- + ว gives เข่ว, ขว + เ- gives เขว่);
 * - the invisible o: no vowel is written ◌ alone in an open syllable, so กล or
 *   พล can only be an onset, the invisible o and a final.
 */
import { ONSETS } from '../consonants/onsets';
import type { SyllableParts } from '../render';
import { TONE_MARK, VOWEL } from '../types';
import { closedTemplate, CONSONANT_SLOT } from '../vowels';

/** Rejects an onset and a final that are written side by side and form another onset. */
export function finalFormsOnset({
  onset,
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): string | null {
  if (final === null || mark !== TONE_MARK.None || vowel.id === VOWEL.O) return null;

  // The final sits right after the onset when the template ends with the consonant slot.
  const template = closedTemplate(vowel, final, mark);
  if (template === null || !template.endsWith(CONSONANT_SLOT)) return null;

  // TODO: accept several analyses per text
  // both readings exist in real words:
  // - เขว (to deviate), แหน (duckweed) as onset + final
  // - แปล (to translate), เหว (abyss) as onset + open vowel
  // Rather than leaving out this one, take the player's
  // answers as right if they match any of the analysis.
  const sideBySide = onset.text + final;
  if (!ONSETS.some((other) => other.text === sideBySide)) return null;
  return `Onset ${onset.text} + final ${final} would read as onset ${sideBySide}`;
}
