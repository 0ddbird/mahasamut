/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientDevice, setAnalyticsEnabledInTests, trackEvent } from './analytics';

describe('analytics', () => {
  beforeEach(() => {
    setAnalyticsEnabledInTests(false);
  });

  afterEach(() => {
    setAnalyticsEnabledInTests(false);
    vi.restoreAllMocks();
  });

  it('detects desktop vs mobile using window.matchMedia', () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 48rem)',
    })) as unknown as typeof window.matchMedia;
    expect(getClientDevice()).toBe('mobile');

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
    })) as unknown as typeof window.matchMedia;
    expect(getClientDevice()).toBe('desktop');

    window.matchMedia = originalMatchMedia;
  });

  it('does nothing in tests when not explicitly enabled', () => {
    const sendBeacon = vi.fn();
    const fetchSpy = vi.fn();
    navigator.sendBeacon = sendBeacon;
    globalThis.fetch = fetchSpy;

    trackEvent({ type: 'support_click' });

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends event via navigator.sendBeacon when enabled', () => {
    setAnalyticsEnabledInTests(true);
    const sendBeacon = vi.fn().mockReturnValue(true);
    navigator.sendBeacon = sendBeacon;

    trackEvent({ type: 'support_click' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith('/api/event', expect.any(Blob));
  });

  it('falls back to fetch when sendBeacon returns false or is unavailable', async () => {
    setAnalyticsEnabledInTests(true);
    const sendBeacon = vi.fn().mockReturnValue(false);
    navigator.sendBeacon = sendBeacon;
    const fetchSpy = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = fetchSpy;

    trackEvent({ type: 'support_click' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/event',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'support_click' }),
        keepalive: true,
      }),
    );
  });

  it('never throws even if sendBeacon or fetch throws', () => {
    setAnalyticsEnabledInTests(true);
    navigator.sendBeacon = vi.fn().mockImplementation(() => {
      throw new Error('network error');
    });
    globalThis.fetch = vi.fn().mockImplementation(() => {
      throw new Error('fetch error');
    });

    expect(() => trackEvent({ type: 'support_click' })).not.toThrow();
  });
});
