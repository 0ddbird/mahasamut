import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
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

// Play remembers the settings: each test starts from the defaults.
afterEach(() => {
  localStorage.clear();
});

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

  it('goes from the link of the syllable game to its settings, then to the game', async () => {
    renderAt('/');
    await userEvent.click(linkTo(GAME.Syllable));
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(GAME_NAMES[GAME.Syllable]) }),
    ).toBeDefined();
    expect(screen.getByRole('group', { name: 'Answer' })).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('group', { name: 'Tone' })).toBeDefined();
  });

  it('goes from the link of the consonant class game to its settings, then to the game', async () => {
    renderAt('/');
    await userEvent.click(linkTo(GAME.ConsonantClass));
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(GAME_NAMES[GAME.ConsonantClass]) }),
    ).toBeDefined();
    expect(screen.getByRole('group', { name: 'Length' })).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('group', { name: 'Consonant class' })).toBeDefined();
  });

  it('plays a game with the settings in its URL', () => {
    renderAt('/consonant-class/play?count=5');
    expect(screen.getByText('Question 1 / 5')).toBeDefined();
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
