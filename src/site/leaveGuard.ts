/**
 * Whether leaving the page now would lose something: a game in progress, which
 * is not saved. The page says so with useLeaveGuard; the navigation bar asks
 * useIsLeaveGuarded before it leaves, and asks the player first if so. The
 * state lives in LeaveGuardProvider.
 *
 * Without a provider nothing is guarded, so that a page renders on its own, as
 * in its tests.
 */
import { createContext, useContext, useEffect } from 'react';

interface LeaveGuard {
  guarded: boolean;
  setGuarded: (guarded: boolean) => void;
}

export const LeaveGuardContext = createContext<LeaveGuard>({
  guarded: false,
  setGuarded: () => {},
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
