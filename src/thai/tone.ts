/**
 * The Thai tone rule: the tone of a written syllable follows from the class
 * of its initial consonant, its tone mark, whether it is live or dead, and —
 * only for dead low-class syllables — its vowel length.
 */
import { CONSONANT_CLASS, LIVENESS, TONE, TONE_MARK, VOWEL_LENGTH } from './types';
import type { ConsonantClass, Liveness, Tone, ToneMark, VowelLength } from './types';

/**
 * With a tone mark, only the class and the mark count. Without one, the
 * live/dead status decides.
 *
 * @throws if ๊ (trii) or ๋ (djattawaa) is used outside the mid class.
 */
export function computeTone(
  consonantClass: ConsonantClass,
  liveness: Liveness,
  length: VowelLength,
  mark: ToneMark,
): Tone {
  if (mark !== TONE_MARK.None) return markedTone(consonantClass, mark);

  if (liveness === LIVENESS.Live) {
    return consonantClass === CONSONANT_CLASS.High ? TONE.Rising : TONE.Mid;
  }
  if (consonantClass === CONSONANT_CLASS.Low) {
    return length === VOWEL_LENGTH.Short ? TONE.High : TONE.Falling;
  }
  return TONE.Low;
}

/** Tone of a syllable that carries a tone mark: only the class and the mark count. */
function markedTone(
  consonantClass: ConsonantClass,
  mark: Exclude<ToneMark, typeof TONE_MARK.None>,
): Tone {
  switch (mark) {
    case TONE_MARK.Eek:
      return consonantClass === CONSONANT_CLASS.Low ? TONE.Falling : TONE.Low;
    case TONE_MARK.Thoo:
      return consonantClass === CONSONANT_CLASS.Low ? TONE.High : TONE.Falling;
    case TONE_MARK.Trii:
    case TONE_MARK.Djattawaa:
      if (consonantClass !== CONSONANT_CLASS.Mid) {
        throw new Error(`Tone mark ${mark} is for mid class only, got ${consonantClass}`);
      }
      return mark === TONE_MARK.Trii ? TONE.High : TONE.Rising;
  }
}
