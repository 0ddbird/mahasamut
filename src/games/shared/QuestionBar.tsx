import { Countdown } from '../../components/Countdown/Countdown';
import styles from './QuestionBar.module.scss';

interface QuestionBarProps {
  /** The question shown, from 1. */
  questionNumber: number;
  /** The length of the series; null in an endless game. */
  questionCount: number | null;
  /** The time left to answer; null when there is none to show. */
  remainingMs: number | null;
  /** The time of each question; null in free time. */
  secondsPerQuestion: number | null;
}

/**
 * Above the question, during a game: where the player is on the left, the
 * clock on the right when the game is timed; without a clock, where the player
 * is stands alone, centred. The score waits for the results; End is in the
 * site's bar.
 */
export function QuestionBar({
  questionNumber,
  questionCount,
  remainingMs,
  secondsPerQuestion,
}: QuestionBarProps) {
  const timed = remainingMs !== null && secondsPerQuestion !== null;
  return (
    <div className={styles.bar} data-clockless={!timed || undefined}>
      <div className={styles.question}>
        <span className={styles.label}>Question</span>
        <span className={styles.value}>
          {questionCount === null ? questionNumber : `${questionNumber} / ${questionCount}`}
        </span>
      </div>
      <div className={styles.time}>
        {timed && <Countdown remainingMs={remainingMs} totalMs={secondsPerQuestion * 1000} />}
      </div>
    </div>
  );
}
