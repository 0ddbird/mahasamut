import { Flag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ReportDialog } from './ReportDialog';
import type { ReportInput, ReportOutcome, ReportedQuestion } from './report';
import styles from './ReportFlag.module.scss';

const LABEL = 'Report a problem with this question';

interface ReportFlagProps {
  /** The question shown, as the recap lists it. */
  question: ReportedQuestion;
  /**
   * Called with true when the report window opens and with false when it
   * closes, however it does, or when the flag goes away while it is open: the
   * game pauses meanwhile and must never stay paused.
   */
  onOpenChange: (open: boolean) => void;
  /** Sends the report; only tests give their own. */
  send?: (input: ReportInput) => Promise<ReportOutcome>;
}

/**
 * The small flag at the bottom right of a solo question, through the whole
 * question, before and after the answer: it opens the report window for the
 * question shown. It is discreet on purpose, reporting is not part of the game.
 *
 * ReportDialog does not give the focus back when it closes: the flag does.
 */
export function ReportFlag({ question, onOpenChange, send }: ReportFlagProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  // The latest callback, so that an inline one does not restart the effect below.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  // One place for every way out, the unmount included.
  useEffect(() => {
    if (!open) return;
    onOpenChangeRef.current(true);
    return () => onOpenChangeRef.current(false);
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.flag}
        title={LABEL}
        aria-label={LABEL}
        onClick={() => setOpen(true)}
      >
        <Flag size={20} aria-hidden="true" />
      </button>
      {open && (
        <ReportDialog
          question={question}
          where="question"
          mode="solo"
          onClose={close}
          send={send}
        />
      )}
    </>
  );
}
