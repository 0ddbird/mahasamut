/** Low-class consonants (อักษรต่ำ): 23 letters, without the obsolete ฅ. */
import { CONSONANT_CLASS } from '../types';
import type { Consonant } from './index';

export const LOW_CONSONANTS: readonly Consonant[] = [
  { char: 'ค', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฆ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ง', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ช', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ซ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฌ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ญ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฑ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฒ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ณ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ท', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ธ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'น', consonantClass: CONSONANT_CLASS.Low },
  { char: 'พ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฟ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ภ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ม', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ย', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ร', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ล', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ว', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฬ', consonantClass: CONSONANT_CLASS.Low },
  { char: 'ฮ', consonantClass: CONSONANT_CLASS.Low },
];
