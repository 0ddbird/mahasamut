/**
 * Vowels whose spelling changes when a final consonant follows: part of the
 * vowel is dropped, replaced or added. Some also depend on the final letter
 * (เ-อ before ย) or on the tone mark (เ-ะ and แ-ะ lose their ็).
 */
import { VOWEL, VOWEL_LENGTH } from '../types';
import type { Vowel } from './index';

const SHORT = VOWEL_LENGTH.Short;
const LONG = VOWEL_LENGTH.Long;

export const CHANGING_VOWELS: readonly Vowel[] = [
  // ะ becomes ั before a final: กะ / กัน
  { id: VOWEL.A, length: SHORT, open: '◌ะ', closed: '◌ั' },

  // Drops อ before a final: มือ / มืด
  // @see "Les cahiers d'écriture Assimil - Thaï", p57
  { id: VOWEL.Uee, length: LONG, open: '◌ือ', closed: '◌ื' },

  // Takes ็ before a final (เตะ / เล็ก), which a tone mark replaces (เล่น)
  { id: VOWEL.E, length: SHORT, open: 'เ◌ะ', closed: 'เ◌็', closedMarked: 'เ◌' },

  // Takes ็ before a final (แกะ / แข็ง), which a tone mark replaces (แข่ง)
  { id: VOWEL.Ae, length: SHORT, open: 'แ◌ะ', closed: 'แ◌็', closedMarked: 'แ◌' },

  // TODO: invisible before a final (คน)
  { id: VOWEL.O, length: SHORT, open: 'โ◌ะ', closed: null },

  // Becomes เ◌ิ before a final (เธอ / เดิน), and drops อ before ย (เลย)
  { id: VOWEL.Oee, length: LONG, open: 'เ◌อ', closed: 'เ◌ิ', closedBeforeY: 'เ◌' },

  // Drops ั before a final: ตัว / ควร
  // @see https://www.thaipod101.com/lesson/thai-alphabet-made-easy-15-the-classchanging-h%C7%8Eaw-hiip-short-ua-and-long-ua
  { id: VOWEL.Uua, length: LONG, open: '◌ัว', closed: '◌ว' },
];
