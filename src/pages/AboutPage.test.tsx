import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';

const renderAbout = () =>
  render(
    <MemoryRouter initialEntries={['/about']}>
      <App />
    </MemoryRouter>,
  );

const page = () => within(screen.getByRole('main'));

describe('AboutPage', () => {
  it('is served at /about, under the bar', () => {
    renderAbout();
    expect(screen.getByRole('heading', { level: 1, name: 'About มหาสมุด' })).toBeDefined();
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('explains the name: a great notebook that sounds like the ocean, written in Thai', () => {
    renderAbout();
    for (const word of ['มหา', 'สมุด', 'มหาสมุทร']) {
      expect(page().getByText(word).getAttribute('lang')).toBe('th');
    }
  });

  // Links between pages help search engines find the games.
  it('links to every game', () => {
    renderAbout();
    for (const game of GAME_IDS) {
      expect(page().getByRole('link', { name: GAME_NAMES[game] }).getAttribute('href')).toBe(
        GAME_PATHS[game],
      );
    }
  });

  it('credits the sources the games are made from', () => {
    renderAbout();
    expect(page().getByRole('heading', { level: 2, name: 'Credits' })).toBeDefined();
    expect(page().getByRole('link', { name: 'PyThaiNLP' }).getAttribute('href')).toBe(
      'https://github.com/PyThaiNLP/pythainlp',
    );
    expect(page().getByText(/Thai National Corpus/)).toBeDefined();
  });

  it('says how to support the author, and how to reach them', () => {
    renderAbout();
    expect(page().getByRole('link', { name: 'support me on Ko-fi' }).getAttribute('href')).toBe(
      'https://ko-fi.com/mahasamut',
    );
    expect(page().getByRole('link', { name: 'Write to me' }).getAttribute('href')).toBe('/contact');
  });
});
