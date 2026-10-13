import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThaiDisplay } from './ThaiDisplay';

describe('ThaiDisplay', () => {
  it('shows the text, marked as Thai', () => {
    render(<ThaiDisplay text="ไม่" />);
    expect(screen.getByText('ไม่').getAttribute('lang')).toBe('th');
  });
});
