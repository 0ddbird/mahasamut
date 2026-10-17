import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Countdown } from './Countdown';

describe('Countdown', () => {
  it('shows the seconds left, rounded up', () => {
    const { rerender } = render(<Countdown remainingMs={14_200} />);
    expect(screen.getByRole('timer').textContent).toBe('15 s');

    rerender(<Countdown remainingMs={0} />);
    expect(screen.getByRole('timer').textContent).toBe('0 s');
  });
});
