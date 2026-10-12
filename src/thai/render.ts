/**
 * Rendering: turns the parts of a syllable into Thai text.
 *
 * For now a syllable is a single consonant, a vowel and an optional final
 * consonant, with no tone mark. The consonant takes the place of the dotted
 * circle in the vowel's template; a final consonant uses the vowel's closed
 * template and is written right after it.
 */
import { consonant } from './consonants';
import { finalSound } from './finals';
import { CONSONANT_SLOT } from './vowels';
import type { Vowel } from './vowels';

/**
 * Writes a syllable without tone mark; `finalChar` is the final consonant, if any.
 *
 * @throws if `consonantChar` is not a supported consonant, if `finalChar`
 *   cannot be a final consonant, or if the vowel cannot take a final.
 */
export function render(consonantChar: string, vowel: Vowel, finalChar: string | null = null): string {
  consonant(consonantChar);
  if (finalChar === null) return vowel.open.replace(CONSONANT_SLOT, consonantChar);

  finalSound(finalChar);
  if (vowel.closed === null) throw new Error(`Vowel ${vowel.id} cannot take a final consonant`);
  return vowel.closed.replace(CONSONANT_SLOT, consonantChar) + finalChar;
}
