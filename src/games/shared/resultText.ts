/**
 * How the results of a game are worded: a title that depends on how it went,
 * then the score and the best streak in plain sentences. The texts live here
 * so that a translation can replace them later.
 */
import { scorePercent } from './score';
import type { Score } from './score';

/** The titles by the lowest share of right answers that earns them, best first. */
const TITLES: readonly [minPercent: number, title: string][] = [
  [90, 'Excellent!'],
  [70, 'Well done!'],
  [40, 'Good effort!'],
  [0, 'Keep practising!'],
];

/** The title of the results, from how the game went. */
export function resultTitle(score: Score): string {
  const percent = scorePercent(score);
  if (percent === null) return 'No answers this time.';
  return TITLES.find(([minPercent]) => percent >= minPercent)![1];
}

/** The score in a sentence; null before any question, where the title says it all. */
export function resultSentence(score: Score): string | null {
  const percent = scorePercent(score);
  if (percent === null) return null;
  return `You got ${score.right} out of ${score.played} right (${percent}%).`;
}

/** The best streak in a sentence; null without a single right answer. */
export function streakSentence(score: Score): string | null {
  return score.bestStreak === 0 ? null : `Best streak: ${score.bestStreak} in a row.`;
}
