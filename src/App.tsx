import { Route, Routes } from 'react-router';
import { GAME_IDS, GAME_PATHS } from './games/shared/games';
import { PlayRoute } from './games/shared/PlayRoute';
import { SetupPage } from './games/shared/SetupPage';
import { RoomPage } from './multiplayer/client/RoomPage';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LeaveGuardProvider } from './site/LeaveGuardProvider';
import { PageHead } from './site/PageHead';
import { SiteFooter } from './site/SiteFooter';
import { SiteLayout } from './site/SiteLayout';

/**
 * The routes of the site: the home page, then, under the navigation bar, two
 * routes per game, its settings page and the game itself (`/syllable`,
 * `/syllable/play`), the about page and the not found page; the footer under
 * all of them, and the head's title and tags following the page (PageHead).
 * LeaveGuardProvider wraps them all: the bar and the footer ask before a link
 * leaves a game in progress. The router itself is set in main.tsx, so that
 * tests can render the app inside a MemoryRouter at any path.
 */
function App() {
  return (
    <LeaveGuardProvider>
      <PageHead />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<SiteLayout />}>
          {GAME_IDS.flatMap((game) => [
            <Route key={game} path={GAME_PATHS[game]} element={<SetupPage game={game} />} />,
            <Route
              key={`${game}/play`}
              path={`${GAME_PATHS[game]}/play`}
              element={<PlayRoute game={game} />}
            />,
          ])}
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <SiteFooter />
    </LeaveGuardProvider>
  );
}

export default App;
