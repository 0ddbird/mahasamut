import { Route, Routes } from 'react-router';
import { ConsonantClassPage } from './games/consonantClass/ConsonantClassPage';
import { GAME, GAME_PATHS } from './games/shared/games';
import { SyllablePage } from './games/syllable/SyllablePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The routes of the site: the home page, then one route per game. The router
 * itself is set in main.tsx, so that tests can render the app inside a
 * MemoryRouter at any path.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path={GAME_PATHS[GAME.Syllable]} element={<SyllablePage />} />
      <Route path={GAME_PATHS[GAME.ConsonantClass]} element={<ConsonantClassPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
