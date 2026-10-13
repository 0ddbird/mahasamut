import { Route, Routes } from 'react-router';
import { TonesPage } from './games/tones/TonesPage';
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
      <Route path="/tones" element={<TonesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
