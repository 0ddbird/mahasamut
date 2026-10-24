import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('shows มหาสมุด, and reads as the site name, Mahasamut', () => {
    render(<Logo />);
    const thai = screen.getByText('มหาสมุด');
    expect(thai.getAttribute('lang')).toBe('th');
    expect(thai.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Mahasamut')).toBeDefined();
  });
});
