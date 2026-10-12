/**
 * Rule 1: the tone marks ๊ (trii) and ๋ (djattawaa) are only written on
 * mid-class consonants (โต๊ะ, ก๋วย).
 */
import type { SyllableParts } from '../render';
import { CONSONANT_CLASS, TONE_MARK } from '../types';

/** Rejects ๊ and ๋ on an onset that is not mid class. */
export function midClassOnlyMarks({ onset, mark = TONE_MARK.None }: SyllableParts): string | null {
  const midClassOnlyMark = mark === TONE_MARK.Trii || mark === TONE_MARK.Djattawaa;
  if (midClassOnlyMark && onset.consonantClass !== CONSONANT_CLASS.Mid) {
    return `Tone mark ${mark} needs a mid class onset, got ${onset.text} (${onset.consonantClass})`;
  }
  return null;
}
