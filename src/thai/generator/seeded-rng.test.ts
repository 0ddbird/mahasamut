import { describe, expect, it } from 'vitest';
import { seededRng } from './seeded-rng.test-utils';

const draw = (rng: () => number, count: number) => Array.from({ length: count }, () => rng());

describe('seededRng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(draw(seededRng(42), 10)).toEqual(draw(seededRng(42), 10));
  });

  it('gives another sequence for another seed', () => {
    expect(draw(seededRng(1), 10)).not.toEqual(draw(seededRng(2), 10));
  });

  it('returns numbers in [0, 1)', () => {
    for (const value of draw(seededRng(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads its numbers evenly', () => {
    const values = draw(seededRng(7), 10_000);
    const lowerHalf = values.filter((value) => value < 0.5).length;
    expect(lowerHalf / values.length).toBeCloseTo(0.5, 1);
  });
});
