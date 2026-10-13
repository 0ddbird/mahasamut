/**
 * The five answers of a syllable, in the order the player gives them: the
 * class of the onset, the vowel length, the kind of final, whether the
 * syllable is live or dead, and finally its tone.
 *
 * Each answer follows from the parts of the syllable. The final is the one
 * subtle part: sara koen end with a final sound of their own (ไม่ ends in /y/,
 * น้ำ in /m/), with no final letter written.
 */
import { finalKind, finalSound, liveness } from '../consonants/finals';
import type { SyllableParts } from '../render';
import { computeTone } from '../tone';
import { TONE_MARK } from '../types';
import type { ConsonantClass, FinalKind, FinalSound, Liveness, Tone, VowelLength } from '../types';
import type { Vowel } from '../vowels';

/** The expected answer of each of the five steps. */
export interface SyllableAnswers {
  consonantClass: ConsonantClass;
  vowelLength: VowelLength;
  finalKind: FinalKind;
  liveness: Liveness;
  tone: Tone;
}

/**
 * Computes the five answers of a syllable from its parts.
 *
 * @throws if `final` cannot be a final consonant, or if ๊ or ๋ is used outside
 *   the mid class: the syllable should pass `checkSyllable` first.
 */
export function syllableAnswers({
  onset,
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): SyllableAnswers {
  const consonantClass = onset.consonantClass;
  const vowelLength = vowel.length;

  const sound = syllableFinalSound(vowel, final);
  const kind = finalKind(sound);
  const syllableLiveness = liveness(kind, vowelLength);
  const tone = computeTone(consonantClass, syllableLiveness, vowelLength, mark);

  return { consonantClass, vowelLength, finalKind: kind, liveness: syllableLiveness, tone };
}

/** The final sound of a syllable: from its final letter, or built into a sara koen. */
function syllableFinalSound(vowel: Vowel, final: string | null): FinalSound | null {
  if (final !== null) return finalSound(final);
  return vowel.inherentFinal ?? null;
}
