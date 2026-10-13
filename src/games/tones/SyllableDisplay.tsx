import styles from './SyllableDisplay.module.scss';

interface SyllableDisplayProps {
  /** The syllable as written in Thai. */
  text: string;
}

/** Shows the syllable to read, in large type. */
export function SyllableDisplay({ text }: SyllableDisplayProps) {
  return (
    <p className={styles.syllable} lang="th">
      {text}
    </p>
  );
}
