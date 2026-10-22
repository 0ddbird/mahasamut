import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GAME, GAME_IDS, GAME_NAMES, GAME_PATHS, GAME_SAMPLES } from '../games/shared/games';
import { HomePage } from './HomePage';

function RoomLocation() {
  const { pathname } = useLocation();
  return <p>{`Room at ${pathname}`}</p>;
}

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomLocation />} />
      </Routes>
    </MemoryRouter>,
  );

describe('HomePage', () => {
  it('shows the logo as the page title, then the tagline', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Mahasamut' })).toBeDefined();
    expect(screen.getByText('Games to read Thai script')).toBeDefined();
  });

  it.each(GAME_IDS)('shows a tile for %s: its sample in Thai, its name, its goal', (game) => {
    renderHome();
    const tile = screen.getByRole('link', { name: new RegExp(GAME_NAMES[game]) });
    expect(tile.getAttribute('href')).toBe(GAME_PATHS[game]);
    expect(within(tile).getByText(GAME_SAMPLES[game]).getAttribute('lang')).toBe('th');
    expect(within(tile).getByText(/^Find .+\.$/)).toBeDefined();
  });

  it('lists the vowels, then the consonant classes, then the tone of a syllable', () => {
    renderHome();
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      GAME_PATHS[GAME.Vowel],
      GAME_PATHS[GAME.ConsonantClass],
      GAME_PATHS[GAME.Syllable],
    ]);
  });

  it('has no navigation bar: the logo is the way home', () => {
    renderHome();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('joins a lobby by its ID', async () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 2, name: 'Join a lobby' })).toBeDefined();
    await userEvent.type(screen.getByLabelText('Lobby ID'), ' k7p 2qx ');
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByText('Room at /room/K7P2QX')).toBeDefined();
  });

  it('refuses an ID that cannot be one', async () => {
    renderHome();
    await userEvent.type(screen.getByLabelText('Lobby ID'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByRole('alert').textContent).toBe('This is not a lobby ID.');
  });
});
