/**
 * Rule 2: a final must be a letter that can close a syllable (not ฉ ฌ ผ ฝ ห อ ฮ),
 * after a vowel that takes one (not the open-only vowels nor the sara koen).
 */
import { canBeFinal } from '../consonants/finals';
import type { SyllableParts } from '../render';

/**
 * Rejects a final that cannot close a syllable, or that follows a vowel
 * taking no final.
 *
 * @throws if `final` is not a supported consonant.
 */
export function finalAllowed({ vowel, final = null }: SyllableParts): string | null {
  if (final === null) return null;
  if (!canBeFinal(final)) return `Final ${final} cannot end a syllable`;
  if (vowel.closed === null) return `Vowel ${vowel.id} takes no final, got ${final}`;
  return null;
}
