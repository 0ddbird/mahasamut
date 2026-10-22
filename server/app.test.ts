import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUnifiedServer } from './app';

describe('Unified Server (createUnifiedServer)', () => {
  let server: ReturnType<typeof createUnifiedServer>;
  let baseUrl: string;

  beforeEach(async () => {
    server = createUnifiedServer({
      origin: 'https://mahasamut.app',
      contactTo: 'test@example.com',
      contactTransport: {
        name: 'console',
        send: () => Promise.resolve({ ok: true }),
      },
    });

    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.httpServer.address();
    if (typeof addr === 'object' && addr !== null) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterEach(async () => {
    await server.close();
  });

  it('serves GET /metrics with prometheus format and live gauges', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');

    const text = await res.text();
    expect(text).toContain('# HELP mahasamut_active_rooms');
    expect(text).toContain('mahasamut_active_rooms{phase="lobby"} 0');
    expect(text).toContain('mahasamut_connected_players 0');
  });

  it('rejects POST /metrics with 405', async () => {
    const res = await fetch(`${baseUrl}/metrics`, { method: 'POST' });
    expect(res.status).toBe(405);
  });

  it('serves POST /api/event and records metric in store', async () => {
    const res = await fetch(`${baseUrl}/api/event`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://mahasamut.app',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
      body: JSON.stringify({ type: 'support_click' }),
    });

    expect(res.status).toBe(204);

    const metricsRes = await fetch(`${baseUrl}/metrics`);
    const metricsText = await metricsRes.text();
    expect(metricsText).toContain('mahasamut_support_clicks_total 1');
  });

  it('serves POST /api/contact and updates contact metrics', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://mahasamut.app',
      },
      body: JSON.stringify({
        email: 'visitor@example.com',
        subject: 'General feedback',
        message: 'Hello world, wonderful website!',
        website: '',
        elapsedMs: 5000,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ result: 'sent' });

    const metricsRes = await fetch(`${baseUrl}/metrics`);
    const metricsText = await metricsRes.text();
    expect(metricsText).toContain('mahasamut_contact_requests_total{outcome="sent"} 1');
  });

  it('returns 404 for unknown paths', async () => {
    const res = await fetch(`${baseUrl}/unknown/path`);
    expect(res.status).toBe(404);
  });
});
