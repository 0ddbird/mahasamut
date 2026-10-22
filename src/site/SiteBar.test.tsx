import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GAME, GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { useGameEndInBar } from './leaveGuard';
import { LeaveGuardProvider } from './LeaveGuardProvider';
import { SiteBar } from './SiteBar';

/** The bar above stand-in pages, each a title and a button, opened at `path`. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteBar />
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        {GAME_IDS.map((game) => (
          <Route
            key={game}
            path={`${GAME_PATHS[game]}/*`}
            element={
              <>
                <h1>{game}</h1>
                <button type="button">On the page</button>
              </>
            }
          />
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
    expect(screen.getByRole('link', { name: 'Mahasamut' }).getAttribute('href')).toBe('/');
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

  // Otherwise Tab would reach the page behind the shade, the menu still open.
  it('closes the menu once the focus leaves it', async () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    await userEvent.click(menuButton());
    for (let i = 0; i <= GAME_IDS.length; i++) await userEvent.tab();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'On the page' }));
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu once a game is chosen', async () => {
    renderAt(GAME_PATHS[GAME.Syllable]);
    await userEvent.click(menuButton());
    await userEvent.click(gameLink(GAME.ConsonantClass));

    expect(screen.getByRole('heading', { level: 1, name: GAME.ConsonantClass })).toBeDefined();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  describe('during a game', () => {
    /** A stand-in game page: in progress while `playing`, ended by `onEnd`. */
    function GamePage({ playing, onEnd }: { playing: boolean; onEnd: () => void }) {
      useGameEndInBar(playing, onEnd);
      return <h1>Game</h1>;
    }

    const renderGame = (playing: boolean, onEnd: () => void = () => {}) =>
      render(
        <MemoryRouter initialEntries={[`${GAME_PATHS[GAME.Vowel]}/play`]}>
          <LeaveGuardProvider>
            <SiteBar />
            <GamePage playing={playing} onEnd={onEnd} />
          </LeaveGuardProvider>
        </MemoryRouter>,
      );

    it('offers End in place of the games, and End ends the game', async () => {
      const onEnd = vi.fn();
      renderGame(true, onEnd);
      expect(screen.queryByRole('navigation', { name: 'Games' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Games menu' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'End' }));
      expect(onEnd).toHaveBeenCalledOnce();
    });

    it('keeps the logo, the way home', () => {
      renderGame(true);
      expect(screen.getByRole('link', { name: 'Mahasamut' }).getAttribute('href')).toBe('/');
    });

    it('brings the games back once the game is over', () => {
      renderGame(false);
      expect(screen.queryByRole('button', { name: 'End' })).toBeNull();
      expect(screen.getByRole('navigation', { name: 'Games' })).toBeDefined();
    });
  });
});
