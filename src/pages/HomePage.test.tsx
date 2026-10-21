import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GAME, GAME_IDS, GAME_NAMES, GAME_PATHS, GAME_SAMPLES } from '../games/shared/games';
import { HomePage } from './HomePage';

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe('HomePage', () => {
  it('shows the logo as the page title, then the tagline', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy Thai' })).toBeDefined();
    expect(screen.getByText('Games to read Thai script')).toBeDefined();
  });

  it.each(GAME_IDS)('shows a tile for %s: its sample in Thai, its name, its goal', (game) => {
    renderHome();
    const tile = screen.getByRole('link', { name: new RegExp(GAME_NAMES[game]) });
    expect(tile.getAttribute('href')).toBe(GAME_PATHS[game]);
    expect(within(tile).getByText(GAME_SAMPLES[game]).getAttribute('lang')).toBe('th');
    expect(within(tile).getByText(/^Find the .+\.$/)).toBeDefined();
  });

  it('lists the consonant class game first: the classes come before the tones', () => {
    renderHome();
    const [first] = screen.getAllByRole('link');
    expect(first?.getAttribute('href')).toBe(GAME_PATHS[GAME.ConsonantClass]);
  });

  it('has no navigation bar: the logo is the way home', () => {
    renderHome();
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
