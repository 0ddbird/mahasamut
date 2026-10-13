import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ValidateButton } from './ValidateButton';

describe('ValidateButton', () => {
  it('calls onClick when clicked', async () => {
    let clicks = 0;
    render(<ValidateButton disabled={false} onClick={() => clicks++} />);

    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(clicks).toBe(1);
  });

  it('cannot be clicked while disabled', async () => {
    let clicks = 0;
    render(<ValidateButton disabled onClick={() => clicks++} />);
    const button = screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;

    await userEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(clicks).toBe(0);
  });
});
