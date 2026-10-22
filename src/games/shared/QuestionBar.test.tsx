import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { QuestionBar } from './QuestionBar';

const renderBar = (props: Partial<ComponentProps<typeof QuestionBar>> = {}) =>
  render(
    <QuestionBar
      questionNumber={3}
      questionCount={10}
      remainingMs={null}
      secondsPerQuestion={null}
      {...props}
    />,
  );

describe('QuestionBar', () => {
  it('shows where the player is in a series', () => {
    renderBar();
    expect(screen.getByText('Question')).toBeDefined();
    expect(screen.getByText('3 / 10')).toBeDefined();
  });

  it('shows the question number alone in an endless game', () => {
    renderBar({ questionNumber: 7, questionCount: null });
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.queryByText(/\//)).toBeNull();
  });

  it('keeps the score for the results', () => {
    renderBar();
    expect(screen.queryByText(/Score/)).toBeNull();
  });

  it('shows the clock when timed, and none in free time', () => {
    const { rerender } = renderBar({ remainingMs: 12_000, secondsPerQuestion: 15 });
    expect(screen.getByRole('timer', { name: '12 seconds' }).textContent).toBe('12');

    rerender(
      <QuestionBar
        questionNumber={3}
        questionCount={10}
        remainingMs={null}
        secondsPerQuestion={null}
      />,
    );
    expect(screen.queryByRole('timer')).toBeNull();
  });

  // The site's bar offers End during a game, in place of the games.
  it('leaves End to the bar at the top of the page', () => {
    renderBar();
    expect(screen.queryByRole('button', { name: 'End' })).toBeNull();
  });
});
