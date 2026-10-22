import { describe, expect, it } from 'vitest';
import { createEventHandler } from './eventHandler';
import { MetricsStore } from './store';

describe('createEventHandler', () => {
  const origin = 'https://mahasamut.app';
  const defaultUserAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  function setup(currentTime = 1_000_000) {
    let now = currentTime;
    const store = new MetricsStore(':memory:');
    const handler = createEventHandler({
      store,
      origin,
      now: () => now,
    });
    return {
      store,
      handler,
      setNow: (t: number) => {
        now = t;
      },
    };
  }

  it('records valid event and answers 204', () => {
    const { store, handler } = setup();

    const response = handler({
      method: 'POST',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.1',
      body: JSON.stringify({ type: 'page_view', route: '/', device: 'desktop' }),
    });

    expect(response.status).toBe(204);
    const counters = store.getCounters();
    expect(counters).toEqual([
      {
        name: 'mahasamut_page_views_total',
        labels: 'device="desktop",route="/"',
        value: 1,
      },
    ]);
  });

  it('rejects methods other than POST with 405', () => {
    const { handler } = setup();

    const response = handler({
      method: 'GET',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.1',
      body: '',
    });

    expect(response.status).toBe(405);
  });

  it('rejects invalid or missing Content-Type with 415', () => {
    const { handler } = setup();

    expect(
      handler({
        method: 'POST',
        contentType: 'text/plain',
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: '{}',
      }).status,
    ).toBe(415);

    expect(
      handler({
        method: 'POST',
        contentType: undefined,
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: '{}',
      }).status,
    ).toBe(415);
  });

  it('rejects forbidden or missing Origin with 403', () => {
    const { handler } = setup();

    expect(
      handler({
        method: 'POST',
        contentType: 'application/json',
        origin: 'https://evil.com',
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: '{}',
      }).status,
    ).toBe(403);

    expect(
      handler({
        method: 'POST',
        contentType: 'application/json',
        origin: undefined,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: '{}',
      }).status,
    ).toBe(403);
  });

  it('refuses body larger than 1024 bytes with 413', () => {
    const { handler } = setup();

    const largeBody = JSON.stringify({
      type: 'support_click',
      padding: 'x'.repeat(1050),
    });

    const response = handler({
      method: 'POST',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.1',
      body: largeBody,
    });

    expect(response.status).toBe(413);
  });

  it('silently ignores missing or bot User-Agent with 204 without recording', () => {
    const { store, handler } = setup();

    const botUas = [
      undefined,
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'curl/8.1.2',
      'Wget/1.21.3',
      'Python/3.10 aiohttp/3.8.5',
      'Go-http-client/1.1',
      'Mozilla/5.0 HeadlessChrome/120.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Lighthouse',
    ];

    for (const userAgent of botUas) {
      const response = handler({
        method: 'POST',
        contentType: 'application/json',
        origin,
        userAgent,
        ip: '192.0.2.1',
        body: JSON.stringify({ type: 'support_click' }),
      });
      expect(response.status).toBe(204);
    }

    expect(store.getCounters()).toEqual([]);
  });

  it('enforces 60 events/minute rate limit per IP, ignoring beyond limit with 204', () => {
    const { store, handler, setNow } = setup(1_000_000);

    const validPayload = JSON.stringify({ type: 'support_click' });

    // Send 60 requests in the same minute
    for (let i = 0; i < 60; i++) {
      const res = handler({
        method: 'POST',
        contentType: 'application/json',
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: validPayload,
      });
      expect(res.status).toBe(204);
    }

    expect(store.getCounters().find((c) => c.name === 'mahasamut_support_clicks_total')?.value).toBe(60);

    // 61st request in same minute is ignored with 204
    const res61 = handler({
      method: 'POST',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.1',
      body: validPayload,
    });
    expect(res61.status).toBe(204);
    expect(store.getCounters().find((c) => c.name === 'mahasamut_support_clicks_total')?.value).toBe(60);

    // Another IP is not blocked
    const otherIpRes = handler({
      method: 'POST',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.2',
      body: validPayload,
    });
    expect(otherIpRes.status).toBe(204);
    expect(store.getCounters().find((c) => c.name === 'mahasamut_support_clicks_total')?.value).toBe(61);

    // Advance time by 61 seconds: first IP is allowed again
    setNow(1_000_000 + 61_000);
    const afterTimeRes = handler({
      method: 'POST',
      contentType: 'application/json',
      origin,
      userAgent: defaultUserAgent,
      ip: '192.0.2.1',
      body: validPayload,
    });
    expect(afterTimeRes.status).toBe(204);
    expect(store.getCounters().find((c) => c.name === 'mahasamut_support_clicks_total')?.value).toBe(62);
  });

  it('rejects invalid JSON or invalid event schema with 400', () => {
    const { store, handler } = setup();

    expect(
      handler({
        method: 'POST',
        contentType: 'application/json',
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: 'invalid json{',
      }).status,
    ).toBe(400);

    expect(
      handler({
        method: 'POST',
        contentType: 'application/json',
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: JSON.stringify({ type: 'page_view', route: '/untracked' }),
      }).status,
    ).toBe(400);

    expect(
      handler({
        method: 'POST',
        contentType: 'application/json',
        origin,
        userAgent: defaultUserAgent,
        ip: '192.0.2.1',
        body: JSON.stringify({ type: 'unknown_type' }),
      }).status,
    ).toBe(400);

    expect(store.getCounters()).toEqual([]);
  });
});
