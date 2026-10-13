// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

// Vitest globals are off, so Testing Library cannot clean the DOM up by itself.
afterEach(cleanup);

describe('App', () => {
  it('shows the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Wannayuk' })).toBeDefined();
  });
});
