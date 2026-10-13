/**
 * Rendering: turns the parts of a syllable into Thai text.
 *
 * A syllable is an onset (one or two consonants), a vowel, an optional final
 * consonant and an optional tone mark. The onset takes the place of the
 * dotted circle in the vowel's template; a final consonant uses the vowel's
 * closed template and is written right after it.
 *
 * The tone mark sits above the last consonant of the onset (ปล่อย, หน้า).
 * When a vowel sign is also written above or below that consonant
 * (ั ิ ี ึ ื ุ ู), the mark comes after it in the text: ก + ี + ่ gives กี่.
 */
import { finalSound } from './consonants/finals';
import type { Onset } from './consonants/onsets';
import { TONE_MARK_CHAR } from './marks';
import { TONE_MARK } from './types';
import type { ToneMark } from './types';
import { closedTemplate, CONSONANT_SLOT, VOWEL_SIGNS_ON_CONSONANT } from './vowels';
import type { Vowel } from './vowels';

/** The parts of a syllable, as needed to write it. */
export interface SyllableParts {
  onset: Onset;
  vowel: Vowel;
  /** Final consonant letter, if any. */
  final?: string | null;
  /** Tone mark, `none` if omitted. */
  mark?: ToneMark;
}

/**
 * Writes a syllable from its parts.
 *
 * @throws if `final` cannot be a final consonant, or if the vowel cannot take a final.
 */
export function render({
  onset,
  vowel,
  final = null,
  mark = TONE_MARK.None,
}: SyllableParts): string {
  // The vowel is written differently when a final consonant follows (กะ / กัน).
  const template = final === null ? vowel.open : checkedClosedTemplate(vowel, final, mark);

  // What the vowel writes before the onset (เ in เ◌ีย) and after it (ีย).
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
  const finalConsonant = final ?? '';

  // Writing order: เ + ก + ี + ่ + ย + ว → เกี่ยว
  return (
    vowelPartBeforeConsonant +
    onset.text +
    vowelPartOnConsonant +
    toneMarkChar +
    vowelRest +
    finalConsonant
  );
}

function checkedClosedTemplate(vowel: Vowel, final: string, mark: ToneMark): string {
  // Called to raise an exception if final is not valid.
  finalSound(final);
  const template = closedTemplate(vowel, final, mark);
  if (template === null) throw new Error(`Vowel ${vowel.id} cannot take a final consonant`);
  return template;
}
