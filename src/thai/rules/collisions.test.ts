import { describe, expect, it } from 'vitest';
import { CONSONANTS } from '../consonants';
import { ONSETS } from '../consonants/onsets';
import { render } from '../render';
import type { SyllableParts } from '../render';
import { TONE_MARKS } from '../types';
import { VOWEL_SIGNS_ON_CONSONANT, VOWELS } from '../vowels';
import { checkSyllable } from './index';

const TONE_MARK_CODE_POINTS = [0x0e48, 0x0e49, 0x0e4a, 0x0e4b]; // ่ ้ ๊ ๋
const MAI_TAIKHU_CODE_POINT = 0x0e47; // ็

const isToneMark = (char: string) => TONE_MARK_CODE_POINTS.includes(char.codePointAt(0) ?? 0);

/** Every combination of onset, vowel, final (or none) and tone mark (or none). */
function allCombinations(): SyllableParts[] {
  const finals = [null, ...CONSONANTS.map((c) => c.char)];
  const onsetsWithVowels = ONSETS.flatMap((onset) => VOWELS.map((vowel) => ({ onset, vowel })));
  const withEachFinal = (parts: Pick<SyllableParts, 'onset' | 'vowel'>) =>
    finals.map((final) => ({ ...parts, final }));
  const withFinals = onsetsWithVowels.flatMap(withEachFinal);
  const withEachMark = (parts: Pick<SyllableParts, 'onset' | 'vowel' | 'final'>) =>
    TONE_MARKS.map((mark) => ({ ...parts, mark }));
  const withMarks = withFinals.flatMap(withEachMark);

  return withMarks;
}

const describeParts = ({ onset, vowel, final, mark }: SyllableParts) =>
  `${onset.text} + ${vowel.id} + ${final ?? '-'} + ${mark}`;

const VALID_COMBINATIONS = allCombinations()
  .filter((parts) => checkSyllable(parts) === null)
  .map((parts) => ({ parts, text: render(parts) }));

describe('every valid syllable', () => {
  it('enumerates all 391,300 combinations', () => {
    // 65 onsets (42 consonants + 14 consonantic groups + 8 ห + 1 อ (อย))
    // * 28 vowels * (42 finals + no final) * (4 tone marks + no mark)
    expect(allCombinations()).toHaveLength(65 * 28 * 43 * 5);
  });

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
