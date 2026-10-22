import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const footer = () => within(screen.getByRole('contentinfo'));

afterEach(() => {
  localStorage.clear();
});

describe('SiteFooter', () => {
  it.each([
    ['the home page', '/'],
    ['a settings page', GAME_PATHS[GAME.ConsonantClass]],
    ['a game', `${GAME_PATHS[GAME.Syllable]}/play`],
    ['the about page', '/about'],
    ['the not found page', '/nowhere'],
  ])('shows the copyright and its links on %s', (_, path) => {
    renderAt(path);
    expect(footer().getByText('© 2026 Mahasamut')).toBeDefined();
    expect(footer().getByRole('link', { name: 'About' }).getAttribute('href')).toBe('/about');
  });

  // Ko-fi opens in a new tab: the game in this one is not lost.
  it('links to Ko-fi in a new tab', () => {
    renderAt('/');
    const kofi = footer().getByRole('link', { name: /Ko-fi/ });
    expect(kofi.getAttribute('href')).toBe('https://ko-fi.com/mahasamut');
    expect(kofi.getAttribute('target')).toBe('_blank');
    expect(kofi.getAttribute('rel')).toContain('noopener');
  });

  it('asks before leaving a game for the about page, like the logo', async () => {
    renderAt(`${GAME_PATHS[GAME.ConsonantClass]}/play`);
    const row = within(screen.getByRole('group', { name: 'Consonant class' }));
    await userEvent.click(row.getByRole('radio', { name: 'High' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));

    await userEvent.click(footer().getByRole('link', { name: 'About' }));
    expect(screen.getByRole('alertdialog', { name: 'Leave the game?' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByRole('heading', { level: 1, name: 'About Mahasamut' })).toBeDefined();
  });
});
