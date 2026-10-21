import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionBar } from './QuestionBar';

const renderBar = (props: Partial<ComponentProps<typeof QuestionBar>> = {}) =>
  render(
    <QuestionBar
      questionNumber={3}
      questionCount={10}
      remainingMs={null}
      secondsPerQuestion={null}
      onEnd={() => {}}
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
        onEnd={() => {}}
      />,
    );
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('ends the game', async () => {
    const onEnd = vi.fn();
    renderBar({ onEnd });
    await userEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
