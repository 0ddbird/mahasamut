import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Verdict } from './Verdict';

describe('Verdict', () => {
  it('says the answer is correct', () => {
    render(<Verdict correct />);
    expect(screen.getByRole('status').textContent).toBe('Correct!');
  });

  it('says the answer is not quite right', () => {
    render(<Verdict correct={false} />);
    expect(screen.getByRole('status').textContent).toBe('Not quite');
  });

  it('says the time is up', () => {
    render(<Verdict correct={false} timeUp />);
    expect(screen.getByRole('status').textContent).toBe("Time's up!");
  });
});
