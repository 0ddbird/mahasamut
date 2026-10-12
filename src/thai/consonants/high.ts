/** High-class consonants (อักษรสูง): 10 letters, without the obsolete ฃ. */
import { CONSONANT_CLASS } from '../types';
import type { Consonant } from './index';

export const HIGH_CONSONANTS: readonly Consonant[] = [
  { char: 'ข', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฉ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฐ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ถ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ผ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ฝ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ศ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ษ', consonantClass: CONSONANT_CLASS.High },
  { char: 'ส', consonantClass: CONSONANT_CLASS.High },
  { char: 'ห', consonantClass: CONSONANT_CLASS.High },
];
