import styles from './Verdict.module.scss';

interface VerdictProps {
  /** True only if all five steps are right. */
  correct: boolean;
}

/** The overall result of the answers, announced to screen readers when it appears. */
export function Verdict({ correct }: VerdictProps) {
  return (
    <p className={styles.verdict} role="status">
      {correct ? 'Correct!' : 'Not quite'}
    </p>
  );
}
