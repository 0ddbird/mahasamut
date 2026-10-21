import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './ConfirmDialog.module.scss';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks the player to confirm an action that loses something, over a dimmed
 * page. The focus starts on the cancel button, the safe choice, and stays on
 * the two buttons; Escape and a click beside the dialog cancel.
 *
 * Drawn by hand rather than with <dialog>: jsdom, where the tests run, has no
 * showModal.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const confirmButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButton.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
      return;
    }
    // Two buttons: Tab, either way, goes to the other one.
    if (event.key === 'Tab') {
      event.preventDefault();
      const other = document.activeElement === confirmButton.current ? cancelButton : confirmButton;
      other.current?.focus();
    }
  };

  return (
    <div className={styles.layer} onKeyDown={onKeyDown}>
      <div data-testid="dialog-backdrop" className={styles.backdrop} onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={styles.dialog}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <div className={styles.buttons}>
          <button ref={confirmButton} type="button" className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button ref={cancelButton} type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
