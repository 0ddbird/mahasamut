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
  onEnd: () => void;
}

/**
 * Above the question, during a game: where the player is on the left, the
 * clock on the right when the game is timed, and between them a quiet way to
 * end the game. The score waits for the results.
 */
export function QuestionBar({
  questionNumber,
  questionCount,
  remainingMs,
  secondsPerQuestion,
  onEnd,
}: QuestionBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.question}>
        <span className={styles.label}>Question</span>
        <span className={styles.value}>
          {questionCount === null ? questionNumber : `${questionNumber} / ${questionCount}`}
        </span>
      </div>
      <button type="button" className={styles.end} onClick={onEnd}>
        End
      </button>
      <div className={styles.time}>
        {remainingMs !== null && secondsPerQuestion !== null && (
          <Countdown remainingMs={remainingMs} totalMs={secondsPerQuestion * 1000} />
        )}
      </div>
    </div>
  );
}
