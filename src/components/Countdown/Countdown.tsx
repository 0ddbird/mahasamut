import styles from './Countdown.module.scss';

/** From this many seconds left, the clock turns to the warning colour. */
const LOW_SECONDS = 5;

interface CountdownProps {
  /** The time left to answer, in milliseconds. */
  remainingMs: number;
  /** The whole time of the question, in milliseconds: the full ring. */
  totalMs: number;
}

/**
 * The time left to answer: a ring that empties as the time runs out, with the
 * seconds inside. The seconds are rounded up, so that 0 only shows once the
 * time is really up; the last ones turn to the warning colour.
 */
export function Countdown({ remainingMs, totalMs }: CountdownProps) {
  const left = Math.max(0, remainingMs);
  const seconds = Math.ceil(left / 1000);
  // The ring is drawn on a path of length 100: its offset is the share gone.
  const gone = 100 * (1 - Math.min(1, left / totalMs));

  return (
    <div className={styles.clock} data-low={seconds <= LOW_SECONDS || undefined}>
      <svg className={styles.ring} viewBox="0 0 48 48" aria-hidden="true">
        <circle className={styles.track} cx="24" cy="24" r="21" pathLength={100} />
        <circle
          data-ring="left"
          className={styles.left}
          cx="24"
          cy="24"
          r="21"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={gone}
        />
      </svg>
      {/* The bare number reads at a glance as it ticks; its name keeps the unit. */}
      <span className={styles.seconds} role="timer" aria-label={`${seconds} seconds`}>
        {seconds}
      </span>
    </div>
  );
}
