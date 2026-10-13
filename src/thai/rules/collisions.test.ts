import { describe, expect, it } from 'vitest';
import { validSyllables } from '../generator/syllables';
import type { Syllable } from '../generator/syllables';
import type { SyllableParts } from '../render';
import { VOWEL_SIGNS_ON_CONSONANT } from '../vowels';

const TONE_MARK_CODE_POINTS = [0x0e48, 0x0e49, 0x0e4a, 0x0e4b]; // ่ ้ ๊ ๋
const MAI_TAIKHU_CODE_POINT = 0x0e47; // ็

const isToneMark = (char: string) => TONE_MARK_CODE_POINTS.includes(char.codePointAt(0) ?? 0);

const describeParts = ({ onset, vowel, final, mark }: SyllableParts) =>
  `${onset.text} + ${vowel.id} + ${final ?? '-'} + ${mark}`;

// The syllables the generator draws from: every combination that passes the rules.
const VALID_COMBINATIONS = validSyllables();

const syllablesByText = new Map<string, Syllable[]>();
for (const syllable of VALID_COMBINATIONS) {
  const syllables = syllablesByText.get(syllable.text) ?? [];
  syllables.push(syllable);
  syllablesByText.set(syllable.text, syllables);
}

// Homographs: texts written by several combinations, such as เกร (ก + เ- + ร, or
// the cluster กร + เ-). The game accepts the answers of either reading.
const HOMOGRAPHS = [...syllablesByText.values()].filter((syllables) => syllables.length > 1);

const report = (syllables: Syllable[]) =>
  `${syllables[0]?.text}: ${syllables.map((s) => describeParts(s.parts)).join(' | ')}`;

describe('homographs', () => {
  it('include เกร, written ก + เ- + ร or กร + เ-', () => {
    const readings = (syllablesByText.get('เกร') ?? []).map((s) => describeParts(s.parts));
    expect(readings.sort()).toEqual(['ก + ee + ร + none', 'กร + ee + - + none']);
  });

  it('have two readings only: one with a final, one without', () => {
    const unexpected = HOMOGRAPHS.filter((syllables) => {
      const withFinal = syllables.filter((s) => s.parts.final !== null);
      return syllables.length !== 2 || withFinal.length !== 1;
    });
    expect(unexpected.map(report)).toEqual([]);
  });

  it('give both readings the same answers, except for the kind of final', () => {
    const differing = HOMOGRAPHS.filter(([first, second]) => {
      if (first === undefined || second === undefined) return true;
      const a = first.answers;
      const b = second.answers;
      return (
        a.consonantClass !== b.consonantClass ||
        a.vowelLength !== b.vowelLength ||
        a.liveness !== b.liveness ||
        a.tone !== b.tone
      );
    });
    expect(differing.map(report)).toEqual([]);
  });
});

describe('every valid syllable', () => {
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
