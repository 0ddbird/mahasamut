/**
 * Validity rules: which combinations of onset, vowel, final and tone mark make
 * a syllable the game can show.
 *
 * `render` writes any combination it can spell. Some of them are not proper
 * Thai spelling, and some could be read in two ways, which would make the
 * expected answers ambiguous for the player. These rules leave them out.
 */
import { canBeFinal } from '../consonants/finals';
import type { SyllableParts } from '../render';
import { CONSONANT_CLASS, TONE_MARK } from '../types';

/**
 * Checks whether a syllable can be shown in the game.
 *
 * @returns `null` if the syllable is valid, otherwise the reason it is not.
 * @throws if `final` is not a supported consonant.
 */
export function checkSyllable({
  onset,
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): string | null {
  // ๊ and ๋ are only written on mid-class consonants (โต๊ะ, ก๋วย).
  const midClassOnlyMark = mark === TONE_MARK.Trii || mark === TONE_MARK.Djattawaa;
  if (midClassOnlyMark && onset.consonantClass !== CONSONANT_CLASS.Mid) {
    return `Tone mark ${mark} needs a mid class onset, got ${onset.text} (${onset.consonantClass})`;
  }

  // A final must be a letter that can close a syllable (not ฉ ฌ ผ ฝ ห อ ฮ),
  // after a vowel that takes one (not the open-only vowels nor the sara koen).
  if (final !== null) {
    if (!canBeFinal(final)) return `Final ${final} cannot end a syllable`;
    if (vowel.closed === null) return `Vowel ${vowel.id} takes no final, got ${final}`;
  }

  return null;
}
