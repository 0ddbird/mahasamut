/** Mid-class consonants (อักษรกลาง): 9 letters. */
import { CONSONANT_CLASS } from '../types';
import type { Consonant } from './index';

export const MID_CONSONANTS: readonly Consonant[] = [
  { char: 'ก', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'จ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ฎ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ฏ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ด', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ต', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'บ', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'ป', consonantClass: CONSONANT_CLASS.Mid },
  { char: 'อ', consonantClass: CONSONANT_CLASS.Mid },
];
