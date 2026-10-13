import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('shows its label and calls onClick when clicked', async () => {
    let clicks = 0;
    render(<Button onClick={() => clicks++}>Next</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(clicks).toBe(1);
  });

  it('cannot be clicked while disabled', async () => {
    let clicks = 0;
    render(
      <Button disabled onClick={() => clicks++}>
        Validate
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;

    await userEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(clicks).toBe(0);
  });

  it('does not submit a form it is in', () => {
    render(<Button onClick={() => {}}>Next</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });
});
