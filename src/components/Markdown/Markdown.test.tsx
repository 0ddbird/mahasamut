import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders paragraphs and lists', () => {
    render(<Markdown text={'A paragraph.\n\n- one\n- two'} />);
    expect(screen.getByText('A paragraph.')).toBeDefined();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['one', 'two']);
  });

  it('renders tables', () => {
    render(<Markdown text={'| Mid | High |\n| :-: | :-: |\n| ก | ข |'} />);
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Mid',
      'High',
    ]);
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['ก', 'ข']);
  });

  it('puts a table in a box of its own, which keyboard users can scroll when it is too wide', () => {
    render(<Markdown text={'| Mid | High |\n| :-: | :-: |\n| ก | ข |'} />);
    const box = screen.getByRole('table').parentElement;
    expect(box?.tagName).toBe('DIV');
    expect(box?.getAttribute('tabindex')).toBe('0');
  });

  it('turns its sections into sub-headings of the panel they sit in', () => {
    render(<Markdown text={'## Simple vowels\n\n### Details'} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Simple vowels' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 4, name: 'Details' })).toBeDefined();
  });

  it('shows HTML as text, never as elements', () => {
    const { container } = render(<Markdown text={'<script>alert(1)</script> <b>bold</b>'} />);
    expect(container.querySelector('script, b')).toBeNull();
  });
});
