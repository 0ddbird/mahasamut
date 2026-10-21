import { describe, expect, it } from 'vitest';
import { resultSentence, resultTitle, streakSentence } from './resultText';
import { EMPTY_SCORE } from './score';
import type { Score } from './score';

/** A score of `right` out of `played`, the streak left aside. */
const scoreOf = (right: number, played: number): Score => ({
  ...EMPTY_SCORE,
  right,
  played,
});

describe('resultTitle', () => {
  it.each([
    [10, 10, 'Excellent!'],
    [9, 10, 'Excellent!'],
    [7, 10, 'Well done!'],
    [4, 10, 'Good effort!'],
    [3, 10, 'Keep practising!'],
    [0, 5, 'Keep practising!'],
  ])('says %i out of %i is "%s"', (right, played, title) => {
    expect(resultTitle(scoreOf(right, played))).toBe(title);
  });

  it('says when no question was answered', () => {
    expect(resultTitle(EMPTY_SCORE)).toBe('No answers this time.');
  });
});

describe('resultSentence', () => {
  it('gives the score in words, with its percentage', () => {
    expect(resultSentence(scoreOf(7, 10))).toBe('You got 7 out of 10 right (70%).');
  });

  it('says nothing before any question', () => {
    expect(resultSentence(EMPTY_SCORE)).toBeNull();
  });
});

describe('streakSentence', () => {
  it('gives the best streak', () => {
    expect(streakSentence({ ...scoreOf(7, 10), bestStreak: 4 })).toBe('Best streak: 4 in a row.');
  });

  it('says nothing without a single right answer', () => {
    expect(streakSentence(scoreOf(0, 5))).toBeNull();
  });
});
