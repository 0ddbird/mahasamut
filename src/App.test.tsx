import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';
import { GAME, GAME_NAMES, GAME_PATHS } from './games/shared/games';
import type { GameId } from './games/shared/games';

/** Renders the app as if the browser had opened `path`. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const linkTo = (game: GameId) => screen.getByRole('link', { name: new RegExp(GAME_NAMES[game]) });

describe('App', () => {
  it('shows the site home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy - Thai' })).toBeDefined();
  });

  it('serves the games at /syllable and /consonant-class', () => {
    expect(GAME_PATHS).toEqual({
      [GAME.Syllable]: '/syllable',
      [GAME.ConsonantClass]: '/consonant-class',
    });
  });

  it('lists each game with a link to its page', () => {
    renderAt('/');
    expect(linkTo(GAME.Syllable).getAttribute('href')).toBe('/syllable');
    expect(linkTo(GAME.ConsonantClass).getAttribute('href')).toBe('/consonant-class');
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('goes to the syllable game from its link', async () => {
    renderAt('/');
    await userEvent.click(linkTo(GAME.Syllable));
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(GAME_NAMES[GAME.Syllable]) }),
    ).toBeDefined();
    expect(screen.getByRole('group', { name: 'Tone' })).toBeDefined();
  });

  it('goes to the consonant class game from its link', async () => {
    renderAt('/');
    await userEvent.click(linkTo(GAME.ConsonantClass));
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(GAME_NAMES[GAME.ConsonantClass]) }),
    ).toBeDefined();
    expect(screen.getByRole('group', { name: 'Consonant class' })).toBeDefined();
  });

  it('no longer serves the old paths', () => {
    renderAt('/tones');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();
  });

  it('shows a not found page for an unknown path, with a way back home', async () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();

    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy - Thai' })).toBeDefined();
  });
});
