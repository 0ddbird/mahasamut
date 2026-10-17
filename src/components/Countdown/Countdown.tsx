import styles from './Countdown.module.scss';

interface CountdownProps {
  /** The time left to answer, in milliseconds. */
  remainingMs: number;
}

/**
 * The time left to answer, in whole seconds rounded up, so that "0 s" only
 * shows once the time is really up.
 */
export function Countdown({ remainingMs }: CountdownProps) {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  return (
    <span className={styles.countdown} role="timer">
      {seconds} s
    </span>
  );
}
