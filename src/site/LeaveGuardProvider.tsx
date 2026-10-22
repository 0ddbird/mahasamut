import { useState } from 'react';
import type { ReactNode } from 'react';
import { LeaveGuardContext } from './leaveGuard';

/**
 * Holds whether leaving the page is guarded, and how to end its game, for the
 * pages and the bar inside it.
 */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const [guarded, setGuarded] = useState(false);
  const [endGame, setEndGameState] = useState<(() => void) | null>(null);
  // A function given to a state setter would be called as an updater: wrap it.
  const [setEndGame] = useState(() => (end: (() => void) | null) => setEndGameState(() => end));
  return (
    <LeaveGuardContext value={{ guarded, setGuarded, endGame, setEndGame }}>
      {children}
    </LeaveGuardContext>
  );
}
