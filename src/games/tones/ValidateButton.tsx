import styles from './ValidateButton.module.scss';

interface ValidateButtonProps {
  /** True while some step has no answer, and once the answers are checked. */
  disabled: boolean;
  onClick: () => void;
}

/** Checks the player's answers. */
export function ValidateButton({ disabled, onClick }: ValidateButtonProps) {
  return (
    <button className={styles.button} type="button" disabled={disabled} onClick={onClick}>
      Validate
    </button>
  );
}
