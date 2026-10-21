import styles from './Verdict.module.scss';

interface VerdictProps {
  /** True only if every graded step is right. */
  correct: boolean;
  /** The time ran out before the player validated: the answer counts as wrong. */
  timeUp?: boolean;
}

/**
 * The overall result of the answers, announced to screen readers when it
 * appears. It is not shown: on screen, the correction of each row says it.
 */
export function Verdict({ correct, timeUp = false }: VerdictProps) {
  const message = timeUp ? "Time's up!" : correct ? 'Correct!' : 'Not quite';
  return (
    <p className={styles.verdict} role="status">
      {message}
    </p>
  );
}
