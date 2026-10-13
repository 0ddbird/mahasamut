import type { ReactNode } from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  /** The label of the button. */
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

/** The app's button, in the main colour. It never submits a form. */
export function Button({ children, onClick, disabled = false }: ButtonProps) {
  return (
    <button className={styles.button} type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
