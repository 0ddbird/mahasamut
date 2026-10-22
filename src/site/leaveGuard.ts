/**
 * What the navigation bar needs to know about the game on the page:
 *
 * - whether leaving now would lose something, a game in progress, which is not
 *   saved. The page says so with useLeaveGuard; the bar asks useIsLeaveGuarded
 *   before it leaves, and asks the player first if so;
 * - how to end that game: the page hands it over with useGameEndInBar, and the
 *   bar shows End in place of the games while it has one (useGameEnd).
 *
 * The state lives in LeaveGuardProvider. Without a provider nothing is guarded
 * and there is no End, so that a page renders on its own.
 */
import { createContext, useContext, useEffect, useRef } from 'react';

interface LeaveGuard {
  guarded: boolean;
  setGuarded: (guarded: boolean) => void;
  /** Ends the game on the page; `null` when no game is in progress. */
  endGame: (() => void) | null;
  setEndGame: (end: (() => void) | null) => void;
}

export const LeaveGuardContext = createContext<LeaveGuard>({
  guarded: false,
  setGuarded: () => {},
  endGame: null,
  setEndGame: () => {},
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
export function useGameEndInBar(active: boolean, end: () => void): void {
  const { setEndGame } = useContext(LeaveGuardContext);
  const latestEnd = useRef(end);
  useEffect(() => {
    latestEnd.current = end;
  });
  useEffect(() => {
    if (!active) return;
    setEndGame(() => latestEnd.current());
    return () => setEndGame(null);
  }, [active, setEndGame]);
}

/** How to end the game on the page, or `null` when none is in progress. */
export function useGameEnd(): (() => void) | null {
  return useContext(LeaveGuardContext).endGame;
}
