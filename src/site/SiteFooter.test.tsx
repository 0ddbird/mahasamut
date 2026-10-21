import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { GAME, GAME_PATHS } from '../games/shared/games';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

afterEach(() => {
  localStorage.clear();
});

describe('SiteFooter', () => {
  it.each([
    ['the home page', '/'],
    ['a settings page', GAME_PATHS[GAME.ConsonantClass]],
    ['a game', `${GAME_PATHS[GAME.Syllable]}/play`],
    ['the not found page', '/nowhere'],
  ])('shows the copyright on %s', (_, path) => {
    renderAt(path);
    expect(screen.getByRole('contentinfo').textContent).toBe('© 2026 Scriptomancy');
  });
});
