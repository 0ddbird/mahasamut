import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

function Broken(): never {
  throw new Error('render failed');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary with ErrorFallback', () => {
  it('replaces a page that fails to render with a message and a way home', () => {
    // React logs the error it hands to the boundary: keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe('/');
  });

  it('hands the error to the capture function', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary fallback={<ErrorFallback />} onError={onError}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toMatchObject({ message: 'render failed' });
    expect(onError.mock.calls[0][1]).toHaveProperty('componentStack');
  });

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary fallback={<ErrorFallback />}>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });
});
