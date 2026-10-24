import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { DEFAULT_LEAVE_PROMPT, LeaveGuardContext } from './leaveGuard';
import type { LeavePrompt } from './leaveGuard';

/**
 * Holds whether leaving the page is guarded and how to end its game, for the
 * pages, the bar and the footer inside it; and asks the player, in a dialog,
 * before a link leaves a game in progress.
 */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [guarded, setGuarded] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState<LeavePrompt>(DEFAULT_LEAVE_PROMPT);
  const [endGame, setEndGameState] = useState<(() => void) | null>(null);
  const [endLabel, setEndLabel] = useState('End');
  // A function given to a state setter would be called as an updater: wrap it.
  const [setEndGame] = useState(() => (end: (() => void) | null) => setEndGameState(() => end));

  // Where a link was about to go while the player confirms, and what gets the
  // focus back if they stay.
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const focusOnStay = useRef<HTMLElement | null>(null);
  const [askToLeave] = useState(() => (to: string, focus: HTMLElement | null) => {
    focusOnStay.current = focus;
    setLeavingTo(to);
  });

  const stay = () => {
    setLeavingTo(null);
    focusOnStay.current?.focus();
  };

  const leave = () => {
    if (leavingTo === null) return;
    setLeavingTo(null);
    navigate(leavingTo);
  };

  return (
    <LeaveGuardContext
      value={{
        guarded,
        setGuarded,
        leavePrompt,
        setLeavePrompt,
        endGame,
        setEndGame,
        endLabel,
        setEndLabel,
        askToLeave,
      }}
    >
      {children}
      {/* After the page, outside the bar, which stays behind the help panels: the dialog goes over both. */}
      {leavingTo !== null && (
        <ConfirmDialog
          title={leavePrompt.title}
          message={leavePrompt.message}
          confirmLabel="Leave"
          cancelLabel="Keep playing"
          onConfirm={leave}
          onCancel={stay}
        />
      )}
    </LeaveGuardContext>
  );
}
