/**
 * What the navigation bar needs to know about the game on the page:
 *
 * - whether leaving now would lose something, a game in progress, which is not
 *   saved. The page says so with useLeaveGuard; the bar asks useIsLeaveGuarded
 *   before it leaves, and asks the player first if so;
 * - how to end that game: the page hands it over with useGameEndInBar, and the
 *   bar shows End in place of the games while it has one (useGameEnd).
 *
 * A link of the bar or of the footer leaves through useLeaveLink, which asks
 * first during a game. The state, and the dialog that asks, live in
 * LeaveGuardProvider. Without a provider nothing is guarded and there is no
 * End, so that a page renders on its own.
 */
import { createContext, useContext, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

interface LeaveGuard {
  guarded: boolean;
  setGuarded: (guarded: boolean) => void;
  /** Ends the game on the page; `null` when no game is in progress. */
  endGame: (() => void) | null;
  setEndGame: (end: (() => void) | null) => void;
  /** The label of the end button in the bar ('End' in solo, 'Leave' in a room). */
  endLabel: string;
  setEndLabel: (label: string) => void;
  /** Asks the player before going to `to`; `focusOnStay` gets the focus back if they stay. */
  askToLeave: (to: string, focusOnStay: HTMLElement | null) => void;
}

export const LeaveGuardContext = createContext<LeaveGuard>({
  guarded: false,
  setGuarded: () => {},
  endGame: null,
  setEndGame: () => {},
  endLabel: 'End',
  setEndLabel: () => {},
  askToLeave: () => {},
});

/** Guards leaving the page while `active` is true, and no longer once it is gone. */
export function useLeaveGuard(active: boolean): void {
  const { setGuarded } = useContext(LeaveGuardContext);
  useEffect(() => {
    setGuarded(active);
    return () => setGuarded(false);
  }, [active, setGuarded]);
}

export function useIsLeaveGuarded(): boolean {
  return useContext(LeaveGuardContext).guarded;
}

/**
 * Hands `end` to the bar while `active` is true, and takes it back once the
 * game is over or the page is gone. The bar always calls the latest `end`.
 */
export function useGameEndInBar(active: boolean, end: () => void, label = 'End'): void {
  const { setEndGame, setEndLabel } = useContext(LeaveGuardContext);
  const latestEnd = useRef(end);
  useEffect(() => {
    latestEnd.current = end;
  });
  useEffect(() => {
    if (!active) return;
    setEndLabel(label);
    setEndGame(() => latestEnd.current());
    return () => {
      setEndGame(null);
      setEndLabel('End');
    };
  }, [active, label, setEndGame, setEndLabel]);
}

/** How to end the game on the page, or `null` when none is in progress. */
export function useGameEnd(): (() => void) | null {
  return useContext(LeaveGuardContext).endGame;
}

/** The label of the end button in the bar ('End' by default, 'Leave' in a room). */
export function useGameEndLabel(): string {
  return useContext(LeaveGuardContext).endLabel;
}

/**
 * The click on a link to `to`, which asks first during a game. A click that
 * opens the link elsewhere (a modifier key, another button) leaves the game
 * where it is, so it goes through. `focusOnStay` names what gets the focus
 * back if the player stays, the link itself by default.
 */
export function useLeaveLink(): (
  to: string,
  focusOnStay?: () => HTMLElement | null,
) => (event: MouseEvent<HTMLAnchorElement>) => void {
  const { guarded, askToLeave } = useContext(LeaveGuardContext);
  return (to, focusOnStay) => (event) => {
    const elsewhere =
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!guarded || elsewhere) return;
    event.preventDefault();
    askToLeave(to, focusOnStay?.() ?? event.currentTarget);
  };
}
