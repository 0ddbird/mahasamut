import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScoreBar } from './ScoreBar';

const SCORE = { right: 3, played: 4, streak: 1, bestStreak: 2 };

describe('ScoreBar', () => {
  it('shows the score', () => {
    render(
      <ScoreBar
        questionNumber={5}
        questionCount={null}
        score={SCORE}
        remainingMs={null}
        onEnd={() => {}}
      />,
    );
    expect(screen.getByText('Score 3 / 4')).toBeDefined();
  });

  it('shows the question number in a series only', () => {
    const { rerender } = render(
      <ScoreBar
        questionNumber={5}
        questionCount={10}
        score={SCORE}
        remainingMs={null}
        onEnd={() => {}}
      />,
    );
    expect(screen.getByText('Question 5 / 10')).toBeDefined();

    rerender(
      <ScoreBar
        questionNumber={5}
        questionCount={null}
        score={SCORE}
        remainingMs={null}
        onEnd={() => {}}
      />,
    );
    expect(screen.queryByText(/Question/)).toBeNull();
  });

  it('shows the time left when timed', () => {
    const { rerender } = render(
      <ScoreBar
        questionNumber={1}
        questionCount={null}
        score={SCORE}
        remainingMs={12_000}
        onEnd={() => {}}
      />,
    );
    expect(screen.getByRole('timer').textContent).toBe('12 s');

    rerender(
      <ScoreBar
        questionNumber={1}
        questionCount={null}
        score={SCORE}
        remainingMs={null}
        onEnd={() => {}}
      />,
    );
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('ends the game', async () => {
    const onEnd = vi.fn();
    render(
      <ScoreBar
        questionNumber={1}
        questionCount={null}
        score={SCORE}
        remainingMs={null}
        onEnd={onEnd}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
