import { Route, Routes } from 'react-router';
import { GAME_IDS, GAME_PATHS } from './games/shared/games';
import { PlayRoute } from './games/shared/PlayRoute';
import { SetupPage } from './games/shared/SetupPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The routes of the site: the home page, then two routes per game, its settings
 * page and the game itself (`/syllable`, `/syllable/play`). The router itself is
 * set in main.tsx, so that tests can render the app inside a MemoryRouter at
 * any path.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {GAME_IDS.flatMap((game) => [
        <Route key={game} path={GAME_PATHS[game]} element={<SetupPage game={game} />} />,
        <Route
          key={`${game}/play`}
          path={`${GAME_PATHS[game]}/play`}
          element={<PlayRoute game={game} />}
        />,
      ])}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
