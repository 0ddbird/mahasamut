import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SyllableDisplay } from './SyllableDisplay';

describe('SyllableDisplay', () => {
  it('shows the syllable, marked as Thai', () => {
    render(<SyllableDisplay text="ไม่" />);
    expect(screen.getByText('ไม่').getAttribute('lang')).toBe('th');
  });
});
