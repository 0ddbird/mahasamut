/**
 * How much the report tunnel passes on to Sentry: one budget for the reports of
 * questions and another for JavaScript errors, so that a burst of errors can
 * never keep a report from getting through. Each has a limit per visitor (per
 * minute and per day) and one for the whole site (per day), which keep the
 * events under Sentry's free quota. Everything is kept in memory, so a restart of
 * the service forgets it. Node loads this file as it is, by stripping its types:
 * no enums, no namespaces, no parameter properties.
 */
import { ipKey } from '../contact/limits.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const BUDGETS: Record<
  'report' | 'error',
  { perMinute: number; perDay: number; sitePerDay: number }
> = {
  report: { perMinute: 10, perDay: 100, sitePerDay: 100 },
  error: { perMinute: 3, perDay: 10, sitePerDay: 50 },
};

/** One event let through, as the windows remember it. */
interface Entry {
  at: number;
  key: string;
}

/**
 * Creates the budgets. `take` spends a place of the budget of `kind` for the
 * visitor at `ip` and says whether there was one. Windows slide: a place comes
 * back a minute (or a day) after it was taken, and a refused call spends nothing.
 */
export function createBudgets(now: () => number): {
  take(kind: 'report' | 'error', ip: string): boolean;
} {
  const entries: Record<'report' | 'error', Entry[]> = { report: [], error: [] };

  return {
    take(kind, ip) {
      const at = now();
      const budget = BUDGETS[kind];
      const key = ipKey(ip);
      // Only the last day matters, to the visitor and to the site alike.
      const recent = entries[kind].filter((entry) => at - entry.at < DAY);
      entries[kind] = recent;

      const mine = recent.filter((entry) => entry.key === key);
      const lastMinute = mine.filter((entry) => at - entry.at < MINUTE).length;
      if (lastMinute >= budget.perMinute || mine.length >= budget.perDay) return false;
      if (recent.length >= budget.sitePerDay) return false;

      recent.push({ at, key });
      return true;
    },
  };
}
