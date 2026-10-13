import { describe, expect, it } from 'vitest';
import { syllableAnswers } from '../answers';
import type { SyllableAnswers } from '../answers';
import { render } from '../render';
import { checkSyllable } from '../rules';
import { allCombinations, categoryGroups, validSyllables } from './syllables';

const VALID = validSyllables();

const sameAnswers = (a: SyllableAnswers, b: SyllableAnswers) =>
  a.consonantClass === b.consonantClass &&
  a.vowelLength === b.vowelLength &&
  a.finalKind === b.finalKind &&
  a.liveness === b.liveness &&
  a.tone === b.tone;

// Each test collects the syllables that break it, so a failure lists them all
// instead of stopping at the first one.
describe('allCombinations', () => {
  it('enumerates all 391,300 combinations', () => {
    // 65 onsets (42 consonants + 14 consonantic groups + 8 ห + 1 อ (อย))
    // * 28 vowels * (42 finals + no final) * (4 tone marks + no mark)
    expect(allCombinations()).toHaveLength(65 * 28 * 43 * 5);
  });
});

describe('validSyllables', () => {
  it('keeps every combination that passes the rules, and only those', () => {
    const passing = allCombinations().filter((parts) => checkSyllable(parts) === null);
    const invalid = VALID.filter((s) => checkSyllable(s.parts) !== null);

    expect(invalid.map((s) => s.text)).toEqual([]);
    expect(VALID).toHaveLength(passing.length);
  });

  it('writes each syllable from its parts', () => {
    const misspelt = VALID.filter((s) => render(s.parts) !== s.text);
    expect(misspelt.map((s) => s.text)).toEqual([]);
  });

  it('gives each syllable the answers of its parts', () => {
    const wrong = VALID.filter((s) => !sameAnswers(syllableAnswers(s.parts), s.answers));
    expect(wrong.map((s) => s.text)).toEqual([]);
  });

  it('counts the answers of its own parts among the analyses of each syllable', () => {
    const missing = VALID.filter((s) => !s.analyses.some((a) => sameAnswers(a, s.answers)));
    expect(missing.map((s) => s.text)).toEqual([]);
  });

  it('gives a syllable one analysis per combination that writes its text', () => {
    const combinationsByText = new Map<string, number>();
    for (const s of VALID)
      combinationsByText.set(s.text, (combinationsByText.get(s.text) ?? 0) + 1);

    const wrongCount = VALID.filter((s) => s.analyses.length !== combinationsByText.get(s.text));
    expect(wrongCount.map((s) => s.text)).toEqual([]);
  });

  it('gives แขว two analyses: ข + แ- + ว with a sonorant final, ขว + แ- with none', () => {
    const khwae = VALID.find((s) => s.text === 'แขว');
    const finalKinds = khwae?.analyses.map((a) => a.finalKind);
    expect(finalKinds?.sort()).toEqual(['none', 'sonorant']);
  });
});

describe('categoryGroups', () => {
  it('has 24 groups: 8 pairs of class and kind of onset, × 3 kinds of final', () => {
    // Leading ห only makes high class onsets, leading อ only mid class ones.
    const CLASSES_AND_ONSET_KINDS = [
      'high single',
      'high cluster',
      'high leadingHo',
      'mid single',
      'mid cluster',
      'mid leadingO',
      'low single',
      'low cluster',
    ];
    const FINAL_KINDS = ['none', 'sonorant', 'stop'];
    const expected = CLASSES_AND_ONSET_KINDS.flatMap((pair) =>
      FINAL_KINDS.map((final) => `${pair} ${final}`),
    );

    const actual = categoryGroups().map(
      ({ category }) => `${category.consonantClass} ${category.onsetKind} ${category.finalKind}`,
    );
    expect(actual.sort()).toEqual(expected.sort());
  });

  it('puts each valid syllable in exactly one group', () => {
    const grouped = categoryGroups().flatMap((g) => g.syllables);
    expect(grouped).toHaveLength(VALID.length);
    expect(new Set(grouped).size).toBe(VALID.length);
  });

  it('puts each syllable in the group of its class, kind of onset and kind of final', () => {
    const misplaced = categoryGroups().flatMap(({ category, syllables }) =>
      syllables.filter(
        (s) =>
          s.answers.consonantClass !== category.consonantClass ||
          s.parts.onset.kind !== category.onsetKind ||
          s.answers.finalKind !== category.finalKind,
      ),
    );
    expect(misplaced.map((s) => s.text)).toEqual([]);
  });
});
