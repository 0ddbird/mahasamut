import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_SCORE } from './score';
import type { Score } from './score';
import { DEFAULT_SETTINGS } from './settings';
import { Summary } from './Summary';

const SCORE: Score = { right: 3, played: 4, streak: 0, bestStreak: 2 };

const renderSummary = (score: Score = SCORE, onPlayAgain = () => {}) =>
  render(
    <MemoryRouter>
      <Summary
        score={score}
        settings={DEFAULT_SETTINGS}
        withAnswerMode
        settingsPath="/syllable"
        onPlayAgain={onPlayAgain}
      />
    </MemoryRouter>,
  );

describe('Summary', () => {
  it('is titled Results', () => {
    renderSummary();
    expect(screen.getByRole('heading', { name: 'Results' })).toBeDefined();
  });

  it('shows the score and its percentage', () => {
    renderSummary();
    expect(screen.getByText('3 / 4 right (75%)')).toBeDefined();
  });

  it('shows no percentage before any question', () => {
    renderSummary(EMPTY_SCORE);
    expect(screen.getByText('0 / 0 right')).toBeDefined();
  });

  it('shows the best streak and the settings played', () => {
    renderSummary();
    expect(screen.getByText('Best streak: 2')).toBeDefined();
    expect(screen.getByText('Endless · Free time · Full reasoning')).toBeDefined();
  });

  it('plays again', async () => {
    const onPlayAgain = vi.fn();
    renderSummary(SCORE, onPlayAgain);
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  it('links back to the settings and home', () => {
    renderSummary();
    expect(screen.getByRole('link', { name: 'Change settings' }).getAttribute('href')).toBe(
      '/syllable',
    );
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/');
  });
});
