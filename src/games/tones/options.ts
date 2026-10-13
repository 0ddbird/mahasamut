/**
 * The choices of each answer row, in display order, with their English labels.
 * The labels live here so that a translation can replace them later.
 */
import { CONSONANT_CLASS, FINAL_KIND, LIVENESS, TONE, VOWEL_LENGTH } from '../../thai/types';
import type { ConsonantClass, FinalKind, Liveness, Tone, VowelLength } from '../../thai/types';

/** One choice of an answer row: the answer it gives, and how it is shown. */
export interface Option<T extends string> {
  value: T;
  label: string;
}

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
