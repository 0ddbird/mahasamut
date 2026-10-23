import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { consonantClassEntry } from './recap';
import type { RecapEntry } from './recap';
import { EMPTY_SCORE } from './score';
import type { Score } from './score';
import { DEFAULT_SETTINGS } from './settings';
import { Summary } from './Summary';

const SCORE: Score = { right: 3, played: 4, streak: 0, bestStreak: 2 };

const RECAP: RecapEntry[] = [consonantClassEntry('ก', 'mid', 'high', 'wrong')];

const renderSummary = (
  score: Score = SCORE,
  onPlayAgain = () => {},
  recap: readonly RecapEntry[] = RECAP,
) =>
  render(
    <Summary
      score={score}
      recap={recap}
      settings={DEFAULT_SETTINGS}
      withAnswerMode
      onPlayAgain={onPlayAgain}
    />,
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

  it('shows the questions played between the score and Play again', () => {
    renderSummary();
    const answers = screen.getByRole('region', { name: 'Your answers' });
    const settings = screen.getByText('Endless · Untimed · Full reasoning');
    const playAgain = screen.getByRole('button', { name: 'Play again' });

    expect(settings.compareDocumentPosition(answers)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(answers.compareDocumentPosition(playAgain)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('has no list without a question played', () => {
    renderSummary(EMPTY_SCORE, () => {}, []);
    expect(screen.queryByRole('region', { name: 'Your answers' })).toBeNull();
  });

  it('reports a question of the recap as made in a solo game', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    render(
      <Summary
        score={SCORE}
        recap={RECAP}
        settings={DEFAULT_SETTINGS}
        withAnswerMode
        onPlayAgain={() => {}}
        send={send}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Report the question ก' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'The expected class is wrong' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ where: 'recap', mode: 'solo' }));
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
