/**
 * Test utility: a game page as the site shows it, under its bar, which holds
 * End during a game. The page's own tests use it to end a game.
 */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { LeaveGuardProvider } from './LeaveGuardProvider';
import { SiteBar } from './SiteBar';

/** Renders `page` under the site's bar, inside a router. */
export const renderInSite = (page: ReactElement) =>
  render(
    <MemoryRouter>
      <LeaveGuardProvider>
        <SiteBar />
        {page}
      </LeaveGuardProvider>
    </MemoryRouter>,
  );
