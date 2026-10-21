import { Outlet } from 'react-router';
import { SiteBar } from './SiteBar';

/** Every page but the home page: the navigation bar above the page. */
export function SiteLayout() {
  return (
    <>
      <SiteBar />
      <Outlet />
    </>
  );
}
