import { useState } from 'react';
import type { ReactNode } from 'react';
import { LeaveGuardContext } from './leaveGuard';

/** Holds whether leaving the page is guarded, for the pages and the bar inside it. */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const [guarded, setGuarded] = useState(false);
  return <LeaveGuardContext value={{ guarded, setGuarded }}>{children}</LeaveGuardContext>;
}
