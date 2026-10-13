import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { generateSyllable } from '../../thai/generator';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { TonesPage } from './TonesPage';

/** The texts of the first `count` syllables drawn with `seed`. */
const textsDrawn = (seed: number, count: number) => {
  const rng = seededRng(seed);
  return Array.from({ length: count }, () => generateSyllable(rng).text);
};

describe('TonesPage', () => {
  it('shows a syllable drawn by the generator', () => {
    const [first] = textsDrawn(7, 1);
    render(<TonesPage rng={seededRng(7)} />);
    expect(screen.getByText(first ?? '').getAttribute('lang')).toBe('th');
  });

  it('draws the next syllable when Next is clicked', async () => {
    const [, second] = textsDrawn(7, 2);
    render(<TonesPage rng={seededRng(7)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(second ?? '').getAttribute('lang')).toBe('th');
  });
});
