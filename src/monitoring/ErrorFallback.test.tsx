import * as Sentry from '@sentry/react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorFallback } from './ErrorFallback';

function Broken(): never {
  throw new Error('render failed');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorFallback', () => {
  it('replaces a page that fails to render with a message and a way home', () => {
    // React logs the error it hands to the boundary: keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <Broken />
      </Sentry.ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe('/');
  });
});
