import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Countdown } from './Countdown';

/** The part of the ring still to run, out of 100: what its dash offset leaves drawn. */
const ringLeft = (container: HTMLElement) =>
  100 - Number(container.querySelector('[data-ring="left"]')?.getAttribute('stroke-dashoffset'));

describe('Countdown', () => {
  it('shows the seconds left, rounded up', () => {
    const { rerender } = render(<Countdown remainingMs={14_200} totalMs={15_000} />);
    expect(screen.getByRole('timer', { name: '15 seconds' }).textContent).toBe('15');

    rerender(<Countdown remainingMs={0} totalMs={15_000} />);
    expect(screen.getByRole('timer', { name: '0 seconds' }).textContent).toBe('0');
  });

  it('empties its ring as the time runs out', () => {
    const { container, rerender } = render(<Countdown remainingMs={15_000} totalMs={15_000} />);
    expect(ringLeft(container)).toBe(100);

    rerender(<Countdown remainingMs={6_000} totalMs={15_000} />);
    expect(ringLeft(container)).toBe(40);

    rerender(<Countdown remainingMs={0} totalMs={15_000} />);
    expect(ringLeft(container)).toBe(0);
  });

  it('warns for the last 5 seconds', () => {
    const { container, rerender } = render(<Countdown remainingMs={5_100} totalMs={15_000} />);
    const clock = container.firstElementChild!;
    expect(clock.hasAttribute('data-low')).toBe(false);

    rerender(<Countdown remainingMs={5_000} totalMs={15_000} />);
    expect(clock.hasAttribute('data-low')).toBe(true);
  });

  it('keeps the drawing out of what screen readers say', () => {
    const { container } = render(<Countdown remainingMs={9_000} totalMs={15_000} />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
