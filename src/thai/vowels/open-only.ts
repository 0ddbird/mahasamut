/**
 * Vowels that never take a final consonant: they only end open syllables
 * (เกาะ, เกียะ, ผัวะ).
 */
import { VOWEL, VOWEL_LENGTH } from '../types';
import type { Vowel } from './index';

const SHORT = VOWEL_LENGTH.Short;

export const OPEN_ONLY_VOWELS: readonly Vowel[] = [
  { id: VOWEL.Or, length: SHORT, open: 'เ◌าะ', closed: null },
  { id: VOWEL.Oe, length: SHORT, open: 'เ◌อะ', closed: null },
  { id: VOWEL.Ia, length: SHORT, open: 'เ◌ียะ', closed: null },
  { id: VOWEL.Uea, length: SHORT, open: 'เ◌ือะ', closed: null },
  { id: VOWEL.Ua, length: SHORT, open: '◌ัวะ', closed: null },
];
