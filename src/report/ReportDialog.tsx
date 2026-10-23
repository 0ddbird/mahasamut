import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Button } from '../components/Button/Button';
import { MAX_COMMENT_LENGTH, REASONS, reasonLabel, sendReport } from './report';
import type {
  ReportInput,
  ReportMode,
  ReportOutcome,
  ReportReason,
  ReportWhere,
  ReportedQuestion,
} from './report';
import styles from './ReportDialog.module.scss';

interface ReportDialogProps {
  question: ReportedQuestion;
  where: ReportWhere;
  mode: ReportMode;
  onClose: () => void;
  /** Called once the report has been received, whether or not the window stays open after. */
  onSent?: () => void;
  /** Sends the report. Defaults to the real one; tests give their own. */
  send?: (input: ReportInput) => Promise<ReportOutcome>;
}

type Phase = 'editing' | 'sending' | 'sent';

/** What the player reads when a report did not go through: the form stays as it was. */
const FAILURE_MESSAGES: Record<Exclude<ReportOutcome, 'sent'>, string> = {
  failed: 'Your report could not be sent. Please try again.',
  limited: 'Too many reports for now. Please try again later.',
};

const FOCUSABLE = 'input, textarea, button, [href], [tabindex]:not([tabindex="-1"])';

/**
 * The window in which a player reports a wrong question: the Thai text, the
 * reasons the game offers (several can apply), an optional comment. Once the
 * report is sent it says thanks; if it fails, the reasons and the comment stay
 * so that the player can try again.
 *
 * Drawn by hand like ConfirmDialog, for the same reason (jsdom has no
 * showModal). The focus starts on the first reason and stays inside; Escape and
 * a click beside the window close it.
 */
export function ReportDialog({
  question,
  where,
  mode,
  onClose,
  onSent,
  send = sendReport,
}: ReportDialogProps) {
  const titleId = useId();
  const commentId = useId();
  const thanksId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const firstReason = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // A ref as well as the phase: a double click can come before React has rendered the disabled button.
  const sending = useRef(false);

  const [checked, setChecked] = useState<ReadonlySet<ReportReason>>(new Set());
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<Phase>('editing');
  const [failure, setFailure] = useState<Exclude<ReportOutcome, 'sent'> | null>(null);

  const offered: readonly ReportReason[] = REASONS[question.game];

  useEffect(() => {
    firstReason.current?.focus();
  }, []);

  // A disabled button loses the focus, and with it the keyboard: put it back
  // on something that is there for each step of the send.
  useEffect(() => {
    if (phase === 'sending') dialog.current?.focus();
    else if (phase === 'sent') closeButton.current?.focus();
    // Send, never Cancel: a stray Enter must not throw away what the player wrote.
    else if (failure) form.current?.querySelector<HTMLElement>('button[type="submit"]')?.focus();
  }, [phase, failure]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) return;
    // Wrap at both ends and leave the rest to the browser, whatever the dialog holds.
    const stops = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => !element.hasAttribute('disabled'),
    );
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const toggle = (reason: ReportReason) => {
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(reason)) next.add(reason);
      return next;
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || checked.size === 0) return;
    sending.current = true;
    setPhase('sending');
    setFailure(null);

    // A send that rejects would leave the form waiting for ever: it is a failure like any other.
    let outcome: ReportOutcome;
    try {
      // In the order of the form, not of the clicks.
      outcome = await send({
        question,
        reasons: offered.filter((reason) => checked.has(reason)),
        comment,
        where,
        mode,
      });
    } catch {
      outcome = 'failed';
    }
    sending.current = false;
    if (outcome === 'sent') {
      setPhase('sent');
      onSent?.();
    } else {
      setPhase('editing');
      setFailure(outcome);
    }
  };

  const canSend = checked.size > 0 && phase === 'editing';

  return (
    <div className={styles.layer} onKeyDown={onKeyDown}>
      <div data-testid="dialog-backdrop" className={styles.backdrop} onClick={onClose} />
      {/* Focusable by script only: a click on its text keeps the focus in the
          window, where Tab and Escape still work, rather than on the page. */}
      <div
        ref={dialog}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
      >
        <h2 id={titleId} className={styles.title}>
          Report a problem
        </h2>
        <p lang="th" className={styles.text}>
          {question.text}
        </p>

        {phase === 'sent' ? (
          <>
            {/* The status is mounted with its text and the focus moves to Close at once, so a
                screen reader may not announce it: Close is described by it as well. */}
            <p id={thanksId} role="status" className={styles.thanks}>
              Thanks!
            </p>
            <div className={styles.buttons}>
              <button
                ref={closeButton}
                type="button"
                className={styles.close}
                aria-describedby={thanksId}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <form ref={form} onSubmit={onSubmit}>
            <fieldset className={styles.reasons}>
              <legend className={styles.legend}>What is wrong?</legend>
              {offered.map((reason, index) => (
                <label key={reason} className={styles.reason}>
                  <input
                    ref={index === 0 ? firstReason : undefined}
                    type="checkbox"
                    checked={checked.has(reason)}
                    onChange={() => toggle(reason)}
                  />
                  {reasonLabel(question.game, reason)}
                </label>
              ))}
            </fieldset>

            <div className={styles.field}>
              <label htmlFor={commentId}>Tell me more</label>
              <textarea
                id={commentId}
                className={styles.comment}
                rows={4}
                maxLength={MAX_COMMENT_LENGTH}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            {failure && (
              <p role="alert" className={styles.failure}>
                {FAILURE_MESSAGES[failure]}
              </p>
            )}

            <div className={styles.buttons}>
              <button type="button" className={styles.cancel} onClick={onClose}>
                Cancel
              </button>
              <Button type="submit" disabled={!canSend}>
                {phase === 'sending' ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
