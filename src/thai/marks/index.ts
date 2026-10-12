/**
 * Tone marks and how they are written.
 *
 * Thai has four tone marks, written above the initial consonant: ่ (mai eek),
 * ้ (mai thoo), ๊ (mai trii) and ๋ (mai djattawaa). A syllable carries at most
 * one of them, and many syllables carry none.
 */
import { TONE_MARK } from '../types';
import type { ToneMark } from '../types';

/**
 * Unicode character of each tone mark; no mark is written for `none`.
 *
 * @see docs/thai_unicode_chart.pdf (Unicode chart for the Thai block, U+0E00–U+0E7F)
 */
export const TONE_MARK_CHAR: Readonly<Record<ToneMark, string>> = {
  [TONE_MARK.None]: '',
  [TONE_MARK.Eek]: String.fromCodePoint(0x0e48), // ่
  [TONE_MARK.Thoo]: String.fromCodePoint(0x0e49), // ้
  [TONE_MARK.Trii]: String.fromCodePoint(0x0e4a), // ๊
  [TONE_MARK.Djattawaa]: String.fromCodePoint(0x0e4b), // ๋
};
