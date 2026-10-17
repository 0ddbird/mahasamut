import { Button } from '../../components/Button/Button';
import { Countdown } from '../../components/Countdown/Countdown';
import type { Score } from './score';
import styles from './ScoreBar.module.scss';

interface ScoreBarProps {
  /** The question shown, from 1. */
  questionNumber: number;
  /** The length of the series; null in an endless game. */
  questionCount: number | null;
  score: Score;
  /** The time left to answer; null when there is none to show. */
  remainingMs: number | null;
  onEnd: () => void;
}

/**
 * Above the question, during a game: where the player is in a series, their
 * score so far, the time left, and a way to end the game at any time.
 */
export function ScoreBar({
  questionNumber,
  questionCount,
  score,
  remainingMs,
  onEnd,
}: ScoreBarProps) {
  return (
    <div className={styles.bar}>
      {questionCount !== null && <span>{`Question ${questionNumber} / ${questionCount}`}</span>}
      <span>{`Score ${score.right} / ${score.played}`}</span>
      {remainingMs !== null && <Countdown remainingMs={remainingMs} />}
      <Button onClick={onEnd}>End</Button>
    </div>
  );
}
