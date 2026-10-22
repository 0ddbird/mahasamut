import type { ReactNode } from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  /** The label of the button. */
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** `'submit'` makes the button submit the form it is in. */
  type?: 'button' | 'submit';
}

/** The app's button, in the main colour. It submits a form only when asked to. */
export function Button({ children, onClick, disabled = false, type = 'button' }: ButtonProps) {
  return (
    <button className={styles.button} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
