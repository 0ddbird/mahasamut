import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NextButton } from './NextButton';

describe('NextButton', () => {
  it('calls onClick when clicked', async () => {
    let clicks = 0;
    render(<NextButton onClick={() => clicks++} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(clicks).toBe(1);
  });
});
