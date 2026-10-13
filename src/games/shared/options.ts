/**
 * The choices of each answer row, in display order, with their English labels.
 * The labels live here so that a translation can replace them later.
 */
import type { Option } from '../../components/AnswerRow/option';
import { TONE_MARK_CHAR } from '../../thai/marks';
import {
  CONSONANT_CLASS,
  FINAL_KIND,
  LIVENESS,
  TONE,
  TONE_MARK,
  VOWEL_LENGTH,
} from '../../thai/types';
import type {
  ConsonantClass,
  FinalKind,
  Liveness,
  Tone,
  ToneMark,
  VowelLength,
} from '../../thai/types';
import { CONSONANT_SLOT } from '../../thai/vowels';

/** A tone mark as it appears in the syllable, on the dotted circle: ◌่. */
const markSign = (mark: Exclude<ToneMark, 'none'>) => CONSONANT_SLOT + TONE_MARK_CHAR[mark];

/**
 * The tone marks are shown as their sign, so that the player can compare it
 * with the syllable; their names follow the romanization of the project.
 */
export const TONE_MARK_OPTIONS: readonly Option<ToneMark>[] = [
  { value: TONE_MARK.None, label: 'None' },
  { value: TONE_MARK.Eek, label: markSign(TONE_MARK.Eek), spokenLabel: 'Mai eek' },
  { value: TONE_MARK.Thoo, label: markSign(TONE_MARK.Thoo), spokenLabel: 'Mai tho' },
  { value: TONE_MARK.Trii, label: markSign(TONE_MARK.Trii), spokenLabel: 'Mai trii' },
  {
    value: TONE_MARK.Djattawaa,
    label: markSign(TONE_MARK.Djattawaa),
    spokenLabel: 'Mai djattawaa',
  },
];

export const CONSONANT_CLASS_OPTIONS: readonly Option<ConsonantClass>[] = [
  { value: CONSONANT_CLASS.High, label: 'High' },
  { value: CONSONANT_CLASS.Mid, label: 'Mid' },
  { value: CONSONANT_CLASS.Low, label: 'Low' },
];

export const VOWEL_LENGTH_OPTIONS: readonly Option<VowelLength>[] = [
  { value: VOWEL_LENGTH.Short, label: 'Short' },
  { value: VOWEL_LENGTH.Long, label: 'Long' },
];

export const FINAL_KIND_OPTIONS: readonly Option<FinalKind>[] = [
  { value: FINAL_KIND.None, label: 'None' },
  { value: FINAL_KIND.Sonorant, label: 'Sonorant' },
  { value: FINAL_KIND.Stop, label: 'Stop' },
];

export const LIVENESS_OPTIONS: readonly Option<Liveness>[] = [
  { value: LIVENESS.Live, label: 'Live' },
  { value: LIVENESS.Dead, label: 'Dead' },
];

/** The five tones in their traditional Thai order: สามัญ, เอก, โท, ตรี, จัตวา. */
export const TONE_OPTIONS: readonly Option<Tone>[] = [
  { value: TONE.Mid, label: 'Mid' },
  { value: TONE.Low, label: 'Low' },
  { value: TONE.Falling, label: 'Falling' },
  { value: TONE.High, label: 'High' },
  { value: TONE.Rising, label: 'Rising' },
];
