import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';

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

  it('lists the consonant class game, Akson sam mu, with a link to /classes', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /Akson sam mu/ }).getAttribute('href')).toBe(
      '/classes',
    );
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('goes to the tone game from its link', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: /Wannayuk/ }));
    expect(screen.getByRole('heading', { level: 1, name: /Wannayuk/ })).toBeDefined();
  });

  it('goes to the consonant class game from its link', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: /Akson sam mu/ }));
    expect(screen.getByRole('heading', { level: 1, name: /Akson sam mu/ })).toBeDefined();
  });

  it('shows a not found page for an unknown path, with a way back home', async () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();

    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Scriptomancy - Thai' })).toBeDefined();
  });
});
