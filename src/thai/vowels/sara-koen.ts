/**
 * Sara koen (สระเกิน, "extra vowels"): short vowels that already end with a
 * final sound, /m/ for ำ, /y/ for ใ and ไ, /w/ for เ-า. That sonorant final
 * makes their syllables live (ไม่, น้ำ), and they never take another final.
 */
import { FINAL_SOUND, VOWEL, VOWEL_LENGTH } from '../types';
import type { Vowel } from './index';

const SHORT = VOWEL_LENGTH.Short;

export const SARA_KOEN_VOWELS: readonly Vowel[] = [
  { id: VOWEL.Am, length: SHORT, open: '◌ำ', closed: null, inherentFinal: FINAL_SOUND.M },
  { id: VOWEL.AiMuan, length: SHORT, open: 'ใ◌', closed: null, inherentFinal: FINAL_SOUND.Y },
  { id: VOWEL.AiMalai, length: SHORT, open: 'ไ◌', closed: null, inherentFinal: FINAL_SOUND.Y },
  { id: VOWEL.Ao, length: SHORT, open: 'เ◌า', closed: null, inherentFinal: FINAL_SOUND.W },
];
