/**
 * Regular vowels: written the same way with or without a final consonant.
 * The final simply goes after the vowel: กา / กาน, เกีย / เกียน.
 */
import { VOWEL, VOWEL_LENGTH } from '../types';
import type { Vowel } from './index';

const SHORT = VOWEL_LENGTH.Short;
const LONG = VOWEL_LENGTH.Long;

export const REGULAR_VOWELS: readonly Vowel[] = [
  { id: VOWEL.Aa, length: LONG, open: '◌า', closed: '◌า' },
  { id: VOWEL.I, length: SHORT, open: '◌ิ', closed: '◌ิ' },
  { id: VOWEL.Ii, length: LONG, open: '◌ี', closed: '◌ี' },
  { id: VOWEL.Ue, length: SHORT, open: '◌ึ', closed: '◌ึ' },
  { id: VOWEL.U, length: SHORT, open: '◌ุ', closed: '◌ุ' },
  { id: VOWEL.Uu, length: LONG, open: '◌ู', closed: '◌ู' },
  { id: VOWEL.Ee, length: LONG, open: 'เ◌', closed: 'เ◌' },
  { id: VOWEL.Aee, length: LONG, open: 'แ◌', closed: 'แ◌' },
  { id: VOWEL.Oo, length: LONG, open: 'โ◌', closed: 'โ◌' },
  { id: VOWEL.Oor, length: LONG, open: '◌อ', closed: '◌อ' },
  { id: VOWEL.Iia, length: LONG, open: 'เ◌ีย', closed: 'เ◌ีย' },
  { id: VOWEL.Ueea, length: LONG, open: 'เ◌ือ', closed: 'เ◌ือ' },
];
