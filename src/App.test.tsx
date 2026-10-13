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
  it('shows the site home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy - Thai' })).toBeDefined();
  });

  it('lists the tone game, Wannayuk, with a link to /tones', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /Wannayuk/ }).getAttribute('href')).toBe('/tones');
  });

  it('announces the consonant class game, Akson sam mu, without a link yet', () => {
    renderAt('/');
    expect(screen.getByText(/Akson sam mu/).textContent).toMatch(/coming soon/i);
    expect(screen.queryByRole('link', { name: /Akson sam mu/ })).toBeNull();
  });

  it('goes to the tone game from its link', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: /Wannayuk/ }));
    expect(screen.getByRole('heading', { level: 1, name: /Wannayuk/ })).toBeDefined();
  });

  it('shows a not found page for an unknown path, with a way back home', async () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();

    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy - Thai' })).toBeDefined();
  });
});
