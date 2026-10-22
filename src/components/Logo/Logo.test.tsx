import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('reads as the site name, Mahasamut', () => {
    const { container } = render(<Logo size="large" />);
    expect(container.textContent).toBe('Mahasamut');
  });
});
