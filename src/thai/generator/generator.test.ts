import { describe, expect, it } from 'vitest';
import { generateSyllable } from './index';
import { seededRng } from './seeded-rng.test-utils';
import { groupByCategory, validSyllables } from './syllables';
import type { Syllable } from './syllables';

// A fixed seed: every run sees the same 5000 syllables, so a failure can be
// replayed. The bounds of the share tests below also hold for other seeds: they
// sit more than 5 standard deviations from the shares measured over 100,000 draws.
const DRAWS = 5000;

/** Generates `count` syllables from a fixed seed. */
const generateMany = (count: number, seed = 42): Syllable[] => {
  const rng = seededRng(seed);
  return Array.from({ length: count }, () => generateSyllable(rng));
};

/** Share of the syllables for which `valueOf` gives `value`. */
const shareOf = (syllables: Syllable[], valueOf: (s: Syllable) => string, value: string) =>
  syllables.filter((s) => valueOf(s) === value).length / syllables.length;

const SYLLABLES = generateMany(DRAWS);

describe('generateSyllable', () => {
  it('gives the same syllables for the same seed', () => {
    const texts = (syllables: Syllable[]) => syllables.map((s) => s.text);
    expect(texts(generateMany(50, 1))).toEqual(texts(generateMany(50, 1)));
  });

  // The generator only chooses: the valid syllables themselves are checked in syllables.test.ts.
  it('only draws syllables from the valid ones', () => {
    const valid = new Set(validSyllables());
    const drawnElsewhere = SYLLABLES.filter((s) => !valid.has(s));
    expect(drawnElsewhere.map((s) => s.text)).toEqual([]);
  });

  it.each(['high', 'mid', 'low'])('draws the %s class a third of the time', (cls) => {
    const share = shareOf(SYLLABLES, (s) => s.answers.consonantClass, cls);
    expect(Math.abs(share - 1 / 3)).toBeLessThan(0.05);
  });

  it.each(['none', 'sonorant', 'stop'])('draws a %s final a third of the time', (kind) => {
    const share = shareOf(SYLLABLES, (s) => s.answers.finalKind, kind);
    expect(Math.abs(share - 1 / 3)).toBeLessThan(0.05);
  });

  // 40% of the draws, plus the syllables that cannot carry a mark (closed ee and
  // aee): about 44% measured over 100,000 draws.
  it('draws no tone mark between 40% and 50% of the time', () => {
    const share = shareOf(SYLLABLES, (s) => s.parts.mark, 'none');
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.5);
  });

  it.each(['single', 'cluster', 'leadingHo', 'leadingO'])('draws %s onsets', (kind) => {
    expect(SYLLABLES.some((s) => s.parts.onset.kind === kind)).toBe(true);
  });

  it.each(['eek', 'thoo', 'trii', 'djattawaa'])('draws the %s tone mark', (mark) => {
    expect(SYLLABLES.some((s) => s.parts.mark === mark)).toBe(true);
  });

  it('draws every vowel', () => {
    const vowelIds = new Set(SYLLABLES.map((s) => s.parts.vowel.id));
    expect(vowelIds.size).toBe(28);
  });

  it('throws if the rng returns a number outside [0, 1)', () => {
    expect(() => generateSyllable(() => 1)).toThrow(/\[0, 1\)/);
  });

  describe('with given groups', () => {
    // A few syllables of different categories: mid and low class, open and closed.
    const HANDPICKED = ['กา', 'มี', 'นก', 'ข้าว'];
    const handpicked = validSyllables().filter((s) => HANDPICKED.includes(s.text));
    const groups = groupByCategory(handpicked);

    it('finds the hand-picked syllables among the valid ones', () => {
      expect(new Set(handpicked.map((s) => s.text))).toEqual(new Set(HANDPICKED));
    });

    it('only draws syllables of those groups', () => {
      const rng = seededRng(3);
      const drawn = Array.from({ length: 500 }, () => generateSyllable(rng, groups));
      const outside = drawn.filter((s) => !handpicked.includes(s));
      expect(outside.map((s) => s.text)).toEqual([]);
    });

    it('can draw each of them', () => {
      const rng = seededRng(3);
      const drawn = new Set(Array.from({ length: 500 }, () => generateSyllable(rng, groups).text));
      expect(drawn).toEqual(new Set(HANDPICKED));
    });

    it('throws a clear error when there are no groups', () => {
      expect(() => generateSyllable(seededRng(1), [])).toThrow(/no syllable group/i);
    });
  });
});
