import type { ClientEvent, DeviceType } from './events';

let analyticsEnabledInTests = false;

export function setAnalyticsEnabledInTests(enabled: boolean): void {
  analyticsEnabledInTests = enabled;
}

export function getClientDevice(): DeviceType {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  return window.matchMedia('(max-width: 48rem)').matches ? 'mobile' : 'desktop';
}

/**
 * Tracks an anonymous application event by sending it to POST /api/event.
 * Uses navigator.sendBeacon when available, falling back to fetch({ keepalive: true }).
 * In tests, this is a no-op unless setAnalyticsEnabledInTests(true) was called.
 * Never throws.
 */
export function trackEvent(event: ClientEvent): void {
  try {
    if (typeof window === 'undefined') return;
    if (import.meta.env?.MODE === 'test' && !analyticsEnabledInTests) {
      return;
    }

    const body = JSON.stringify(event);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/event', blob);
      if (sent) return;
    }

    if (typeof fetch === 'function') {
      void fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics must never throw or disrupt the user
  }
}
