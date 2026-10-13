import styles from './ThaiDisplay.module.scss';

interface ThaiDisplayProps {
  /** The Thai text to read: a syllable, a consonant… */
  text: string;
}

/** Shows the Thai text the player must read, in large type. */
export function ThaiDisplay({ text }: ThaiDisplayProps) {
  return (
    <p className={styles.text} lang="th">
      {text}
    </p>
  );
}
