import styles from './NextButton.module.scss';

interface NextButtonProps {
  onClick: () => void;
}

/** Moves on to a new syllable. */
export function NextButton({ onClick }: NextButtonProps) {
  return (
    <button className={styles.button} type="button" onClick={onClick}>
      Next
    </button>
  );
}
