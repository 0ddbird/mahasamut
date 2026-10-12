/**
 * Rendering: turns the parts of a syllable into Thai text.
 *
 * For now a syllable is a single consonant and a vowel, with no final
 * consonant and no tone mark: the consonant simply takes the place of the
 * dotted circle in the vowel's template.
 */
import { consonant } from './consonants';
import { CONSONANT_SLOT } from './vowels';
import type { Vowel } from './vowels';

/**
 * Writes an open syllable (no final, no tone mark).
 *
 * @throws if `consonantChar` is not a supported consonant.
 */
export function render(consonantChar: string, vowel: Vowel): string {
  consonant(consonantChar);
  return vowel.open.replace(CONSONANT_SLOT, consonantChar);
}
