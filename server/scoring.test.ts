import { describe, expect, it } from 'vitest';
import { questionPoints, rankPlayers } from './scoring';

describe('questionPoints', () => {
  it('gives 0 to a wrong answer, however fast', () => {
    expect(questionPoints(false, 0, 15_000)).toBe(0);
    expect(questionPoints(false, 2_500, 15_000)).toBe(0);
  });

  it('gives 92 and 90 to right answers in 2.5 s and 3 s out of 15 s', () => {
    expect(questionPoints(true, 2_500, 15_000)).toBe(92);
    expect(questionPoints(true, 3_000, 15_000)).toBe(90);
  });

  it('gives 100 to an instant answer and 50 at the deadline', () => {
    expect(questionPoints(true, 0, 15_000)).toBe(100);
    expect(questionPoints(true, 15_000, 15_000)).toBe(50);
  });

  it('keeps the points between 50 and 100 if the delay is off', () => {
    expect(questionPoints(true, -5, 15_000)).toBe(100);
    expect(questionPoints(true, 20_000, 15_000)).toBe(50);
  });
});

describe('rankPlayers', () => {
  it('ranks by score, sharing the rank on a tie', () => {
    const ranked = rankPlayers([
      { pseudo: 'Bob', score: 90 },
      { pseudo: 'Anna', score: 120 },
      { pseudo: 'Cara', score: 90 },
      { pseudo: 'Dan', score: 30 },
    ]);
    expect(ranked).toEqual([
      { rank: 1, pseudo: 'Anna', score: 120 },
      { rank: 2, pseudo: 'Bob', score: 90 },
      { rank: 2, pseudo: 'Cara', score: 90 },
      { rank: 4, pseudo: 'Dan', score: 30 },
    ]);
  });

  it('orders players with the same score by pseudo', () => {
    const ranked = rankPlayers([
      { pseudo: 'Zoé', score: 90 },
      { pseudo: 'Anna', score: 90 },
    ]);
    expect(ranked.map((entry) => entry.pseudo)).toEqual(['Anna', 'Zoé']);
  });
});
