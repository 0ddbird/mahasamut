/**
 * The score of a solo game: how many questions were played and how many were
 * right, with the streak of right answers in a row. Solo games count right
 * answers only; points are for the multiplayer ranking.
 */
export interface Score {
  right: number;
  /** Questions answered or timed out; a question shown but not answered is not played. */
  played: number;
  /** Right answers in a row, up to the last question. */
  streak: number;
  /** The longest streak of the game. */
  bestStreak: number;
}

export const EMPTY_SCORE: Score = { right: 0, played: 0, streak: 0, bestStreak: 0 };

/** The score once one more question is played. */
export function addResult(score: Score, correct: boolean): Score {
  const streak = correct ? score.streak + 1 : 0;
  return {
    right: score.right + (correct ? 1 : 0),
    played: score.played + 1,
    streak,
    bestStreak: Math.max(score.bestStreak, streak),
  };
}

/** The share of right answers, rounded to a whole percent; null before any question. */
export function scorePercent(score: Score): number | null {
  if (score.played === 0) return null;
  return Math.round((score.right / score.played) * 100);
}
