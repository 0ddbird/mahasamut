/**
 * Rule 6: when the final is written right after the onset, with no vowel sign
 * between them, the two must not form another onset.
 *
 * This happens with เ- แ- โ- and the invisible o, and with เ-อ before ย or
 * เ-็ แ-็ under a tone mark, which are then written เ- and แ-. ก + เ- + ร is
 * written เกร, which reads as the cluster กร + เ-; likewise โหม (หม + โ-),
 * แขว (ขว + แ-), โอย (อย + โ-) and กล (กล + invisible o).
 */
import { ONSETS } from '../consonants/onsets';
import type { SyllableParts } from '../render';
import { TONE_MARK } from '../types';
import { closedTemplate, CONSONANT_SLOT } from '../vowels';

/** Rejects an onset and a final that are written side by side and form another onset. */
export function finalFormsOnset({
  onset,
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): string | null {
  if (final === null) return null;

  // The final sits right after the onset when the template ends with the consonant slot.
  const template = closedTemplate(vowel, final, mark);
  if (template === null || !template.endsWith(CONSONANT_SLOT)) return null;

  const sideBySide = onset.text + final;
  if (!ONSETS.some((other) => other.text === sideBySide)) return null;
  return `Onset ${onset.text} + final ${final} would read as onset ${sideBySide}`;
}
