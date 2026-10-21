import { Outlet } from 'react-router';
import { LeaveGuardProvider } from './LeaveGuardProvider';
import { SiteBar } from './SiteBar';

/**
 * Every page but the home page: the navigation bar above the page, which can
 * tell the bar that leaving it now would lose a game in progress.
 */
export function SiteLayout() {
  return (
    <LeaveGuardProvider>
      <SiteBar />
      <Outlet />
    </LeaveGuardProvider>
  );
}
