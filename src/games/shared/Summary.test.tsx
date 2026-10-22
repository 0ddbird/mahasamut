import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_SCORE } from './score';
import type { Score } from './score';
import { DEFAULT_SETTINGS } from './settings';
import { Summary } from './Summary';

const SCORE: Score = { right: 3, played: 4, streak: 0, bestStreak: 2 };

const renderSummary = (score: Score = SCORE, onPlayAgain = () => {}) =>
  render(
    <Summary score={score} settings={DEFAULT_SETTINGS} withAnswerMode onPlayAgain={onPlayAgain} />,
  );

describe('Summary', () => {
  it('is titled by how the game went', () => {
    renderSummary();
    expect(screen.getByRole('heading', { name: 'Well done!' })).toBeDefined();
  });

  it('takes the focus when it shows, so that the player lands on the results', () => {
    renderSummary();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Well done!' }));
  });

  it('gives the score in a sentence, then the best streak and the settings played', () => {
    renderSummary();
    expect(screen.getByText('You got 3 out of 4 right (75%).')).toBeDefined();
    expect(screen.getByText('Best streak: 2 in a row.')).toBeDefined();
    expect(screen.getByText('Endless · Untimed · Full reasoning')).toBeDefined();
  });

  it('says only that there were no answers before any question', () => {
    renderSummary(EMPTY_SCORE);
    expect(screen.getByRole('heading', { name: 'No answers this time.' })).toBeDefined();
    expect(screen.queryByText(/You got/)).toBeNull();
    expect(screen.queryByText(/Best streak/)).toBeNull();
  });

  it('plays again', async () => {
    const onPlayAgain = vi.fn();
    renderSummary(SCORE, onPlayAgain);
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  // The bar above the page already leads home and to each game's settings.
  it('has no links of its own', () => {
    renderSummary();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
