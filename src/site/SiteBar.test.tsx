import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GAME, GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { SiteBar } from './SiteBar';

/** The bar above stand-in pages, each one only a title, opened at `path`. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteBar />
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        {GAME_IDS.map((game) => (
          <Route key={game} path={`${GAME_PATHS[game]}/*`} element={<h1>{game}</h1>} />
        ))}
      </Routes>
    </MemoryRouter>,
  );

const menuButton = () => screen.getByRole('button', { name: 'Games menu' });
const gameLink = (game: (typeof GAME_IDS)[number]) =>
  screen.getByRole('link', { name: GAME_NAMES[game] });

describe('SiteBar', () => {
  it('links the logo to the home page', () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    expect(screen.getByRole('link', { name: 'Scriptomancy Thai' }).getAttribute('href')).toBe('/');
  });

  it('lists every game, the current one marked as the current page', () => {
    renderAt(`${GAME_PATHS[GAME.Syllable]}/play`);
    expect(gameLink(GAME.Syllable).getAttribute('aria-current')).toBe('page');
    expect(gameLink(GAME.ConsonantClass).getAttribute('aria-current')).toBeNull();
    expect(gameLink(GAME.ConsonantClass).getAttribute('href')).toBe(
      GAME_PATHS[GAME.ConsonantClass],
    );
  });

  it('opens and closes the games menu with its button', async () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(menuButton());
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    const list = document.getElementById(menuButton().getAttribute('aria-controls')!);
    expect(list?.hasAttribute('data-open')).toBe(true);

    await userEvent.click(menuButton());
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(list?.hasAttribute('data-open')).toBe(false);
  });

  it('closes the menu on Escape and on a click outside it', async () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    await userEvent.click(menuButton());
    await userEvent.keyboard('{Escape}');
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(menuButton());
    await userEvent.click(screen.getByTestId('menu-shade'));
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('menu-shade')).toBeNull();
  });

  it('closes the menu once a game is chosen', async () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    await userEvent.click(menuButton());
    await userEvent.click(gameLink(GAME.ConsonantClass));

    expect(screen.getByRole('heading', { level: 1, name: GAME.ConsonantClass })).toBeDefined();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });
});
