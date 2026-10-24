import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { GAME, GAME_PATHS } from '../games/shared/games';
import { KOFI_LABEL } from './support';

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

  it('links to the contact and privacy pages, in order, before Ko-fi', () => {
    renderAt('/');
    const links = footer().getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'About',
      'Contact',
      'Privacy',
      KOFI_LABEL,
    ]);
    expect(footer().getByRole('link', { name: 'Contact' }).getAttribute('href')).toBe('/contact');
    expect(footer().getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy');
  });

  // Ko-fi opens in a new tab: the game in this one is not lost.
  it('links to Ko-fi in a new tab', () => {
    renderAt('/');
    const kofi = footer().getByRole('link', { name: KOFI_LABEL });
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
    expect(screen.getByRole('heading', { level: 1, name: 'About มหาสมุด' })).toBeDefined();
  });

  it('asks before leaving a game for the contact page, like the logo', async () => {
    renderAt(`${GAME_PATHS[GAME.ConsonantClass]}/play`);
    const row = within(screen.getByRole('group', { name: 'Consonant class' }));
    await userEvent.click(row.getByRole('radio', { name: 'High' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));

    await userEvent.click(footer().getByRole('link', { name: 'Contact' }));
    expect(screen.getByRole('alertdialog', { name: 'Leave the game?' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeDefined();
  });

  it('asks before leaving a game for the privacy page, like the logo', async () => {
    renderAt(`${GAME_PATHS[GAME.ConsonantClass]}/play`);
    const row = within(screen.getByRole('group', { name: 'Consonant class' }));
    await userEvent.click(row.getByRole('radio', { name: 'High' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));

    await userEvent.click(footer().getByRole('link', { name: 'Privacy' }));
    expect(screen.getByRole('alertdialog', { name: 'Leave the game?' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy and legal notice' }),
    ).toBeDefined();
  });
});
