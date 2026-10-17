import { describe, expect, it } from 'vitest';
import { addResult, EMPTY_SCORE, scorePercent } from './score';
import type { Score } from './score';

/** The score after `results`, played in order. */
const scoreOf = (...results: boolean[]): Score => results.reduce(addResult, EMPTY_SCORE);

describe('addResult', () => {
  it('counts right answers and the current streak', () => {
    expect(scoreOf(true, true)).toEqual({ right: 2, played: 2, streak: 2, bestStreak: 2 });
  });

  it('keeps the best streak after a wrong answer', () => {
    expect(scoreOf(true, true, false, true)).toEqual({
      right: 3,
      played: 4,
      streak: 1,
      bestStreak: 2,
    });
  });
});

describe('scorePercent', () => {
  it('rounds the percentage, and has none before any question', () => {
    expect(scorePercent(scoreOf(true, true, true, false))).toBe(75);
    expect(scorePercent(scoreOf(true, false, false))).toBe(33);
    expect(scorePercent(EMPTY_SCORE)).toBeNull();
  });
});
