import { describe, expect, it } from 'vitest';
import { validSyllables } from '../generator/syllables';
import type { SyllableParts } from '../render';
import { VOWEL_SIGNS_ON_CONSONANT } from '../vowels';

const TONE_MARK_CODE_POINTS = [0x0e48, 0x0e49, 0x0e4a, 0x0e4b]; // ่ ้ ๊ ๋
const MAI_TAIKHU_CODE_POINT = 0x0e47; // ็

const isToneMark = (char: string) => TONE_MARK_CODE_POINTS.includes(char.codePointAt(0) ?? 0);

const describeParts = ({ onset, vowel, final, mark }: SyllableParts) =>
  `${onset.text} + ${vowel.id} + ${final ?? '-'} + ${mark}`;

// The syllables the generator draws from: every combination that passes the rules.
const VALID_COMBINATIONS = validSyllables();

describe('every valid syllable', () => {
  it('is written by one combination only', () => {
    const combinationsByText = new Map<string, string[]>();
    for (const { parts, text } of VALID_COMBINATIONS) {
      const combinations = combinationsByText.get(text) ?? [];
      combinations.push(describeParts(parts));
      combinationsByText.set(text, combinations);
    }

    const textsWithCombinations = [...combinationsByText];
    const collisions = textsWithCombinations.filter(([, combinations]) => combinations.length > 1);
    const collisionReports = collisions.map(
      ([text, combinations]) => `${text}: ${combinations.join(' | ')}`,
    );
    expect(collisionReports).toEqual([]);
  });

  it('carries at most one tone mark', () => {
    const tooManyMarks = VALID_COMBINATIONS.filter(
      ({ text }) => [...text].filter(isToneMark).length > 1,
    );
    expect(tooManyMarks.map(({ text }) => text)).toEqual([]);
  });

  it('never carries both ็ and a tone mark', () => {
    const both = VALID_COMBINATIONS.filter(({ text }) => {
      const chars = [...text];
      const hasMaiTaikhu = chars.some((char) => char.codePointAt(0) === MAI_TAIKHU_CODE_POINT);
      return hasMaiTaikhu && chars.some(isToneMark);
    });
    expect(both.map(({ text }) => text)).toEqual([]);
  });

  it('writes the tone mark after a vowel sign above or below the consonant', () => {
    const misplaced = VALID_COMBINATIONS.filter(({ text }) => {
      const chars = [...text];
      const markIndex = chars.findIndex(isToneMark);
      if (markIndex === -1) return false;
      return VOWEL_SIGNS_ON_CONSONANT.includes(chars[markIndex + 1] ?? '');
    });
    expect(misplaced.map(({ text }) => text)).toEqual([]);
  });
});
