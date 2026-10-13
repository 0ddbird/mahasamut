// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

// Vitest globals are off, so Testing Library cannot clean the DOM up by itself.
afterEach(cleanup);

/** Renders the app as if the browser had opened `path`. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  it('shows the home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /Wannayuk/ })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Start' }).getAttribute('href')).toBe('/play');
  });

  it('goes to the play page from the Start link', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Start' }));
    expect(screen.getByRole('heading', { name: 'Play' })).toBeDefined();
  });

  it('shows a not found page for an unknown path, with a way back home', async () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();

    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { name: /Wannayuk/ })).toBeDefined();
  });
});
