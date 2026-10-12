/**
 * Rendering: turns the parts of a syllable into Thai text.
 *
 * For now a syllable is a single consonant, a vowel, an optional final
 * consonant and an optional tone mark. The consonant takes the place of the
 * dotted circle in the vowel's template; a final consonant uses the vowel's
 * closed template and is written right after it.
 *
 * The tone mark sits above the consonant. When a vowel sign is also written
 * above or below that consonant (ั ิ ี ึ ื ุ ู), the mark comes after it in
 * the text: ก + ี + ่ gives กี่.
 */
import { consonant } from './consonants';
import { finalSound } from './finals';
import { TONE_MARK_CHAR } from './marks';
import { TONE_MARK } from './types';
import type { ToneMark } from './types';
import { CONSONANT_SLOT, VOWEL_SIGNS_ON_CONSONANT } from './vowels';
import type { Vowel } from './vowels';

/**
 * Writes a syllable; `finalChar` is the final consonant, if any.
 *
 * @throws if `consonantChar` is not a supported consonant, if `finalChar`
 *   cannot be a final consonant, or if the vowel cannot take a final.
 */
export function render(
  consonantChar: string,
  vowel: Vowel,
  finalChar: string | null = null,
  mark: ToneMark = TONE_MARK.None,
): string {
  // Only called to raise an exception if consonantChar is not valid.
  consonant(consonantChar);

  // The vowel is written differently when a final consonant follows (กะ / กัน).
  const template = finalChar === null ? vowel.open : closedTemplate(vowel, finalChar, mark);

  // What the vowel writes before the consonant (เ in เ◌ีย) and after it (ีย).
  const [vowelPartBeforeConsonant, vowelPartAfterConsonant] = template.split(CONSONANT_SLOT);

  // A vowel sign sitting above or below the consonant (ี in เ◌ีย) is written
  // right after it...
  const firstCharAfter = vowelPartAfterConsonant.charAt(0);
  const vowelPartOnConsonant = VOWEL_SIGNS_ON_CONSONANT.includes(firstCharAfter)
    ? firstCharAfter
    : '';
  const vowelRest = vowelPartAfterConsonant.slice(vowelPartOnConsonant.length);

  // ... and the tone mark comes after that sign.
  const toneMarkChar = TONE_MARK_CHAR[mark];
  const finalConsonant = finalChar ?? '';

  // Writing order: เ + ก + ี + ่ + ย + ว → เกี่ยว
  return (
    vowelPartBeforeConsonant +
    consonantChar +
    vowelPartOnConsonant +
    toneMarkChar +
    vowelRest +
    finalConsonant
  );
}

function closedTemplate(vowel: Vowel, finalChar: string, mark: ToneMark): string {
  // Called to raise an exception if finalChar is not valid.
  finalSound(finalChar);
  if (vowel.closed === null) throw new Error(`Vowel ${vowel.id} cannot take a final consonant`);
  if (finalChar === 'ย' && vowel.closedBeforeY !== undefined) return vowel.closedBeforeY;
  if (mark !== TONE_MARK.None && vowel.closedMarked !== undefined) return vowel.closedMarked;
  return vowel.closed;
}
