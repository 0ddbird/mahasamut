import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnifiedServer } from './app';
import { parseDsn } from './report/envelope';

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

  it('turns the report tunnel off without a DSN for the site', async () => {
    const res = await fetch(`${baseUrl}/api/report`, {
      method: 'POST',
      headers: { origin: 'https://mahasamut.app' },
      body: '{}',
    });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/report', () => {
  const DSN = 'https://public@o1.ingest.de.sentry.io/42';
  const IP = '198.51.100.23';
  let server: ReturnType<typeof createUnifiedServer>;
  let baseUrl: string;
  let lines: string[];
  let sentry: ReturnType<typeof vi.fn<typeof fetch>>;

  const envelope = (kind: string) =>
    [
      JSON.stringify({ dsn: DSN }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({ tags: { kind } }),
    ].join('\n');

  function post(body: string, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/api/report`, {
      method: 'POST',
      headers: { origin: 'https://mahasamut.app', 'x-real-ip': IP, ...headers },
      body,
    });
  }

  beforeEach(async () => {
    lines = [];
    sentry = vi.fn<typeof fetch>(() => Promise.resolve(new Response('{}', { status: 200 })));
    server = createUnifiedServer({
      origin: 'https://mahasamut.app',
      siteDsn: parseDsn(DSN),
      fetch: sentry,
      log: (line) => lines.push(line),
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

  it('forwards the envelope to Sentry with nothing of the visitor', async () => {
    const body = envelope('report');

    const res = await post(body, {
      'user-agent': 'Visitor Browser',
      'x-forwarded-for': IP,
      cookie: 'a=b',
    });

    expect(res.status).toBe(200);
    expect(sentry).toHaveBeenCalledTimes(1);
    const [url, init] = sentry.mock.calls[0];
    expect(url).toBe('https://o1.ingest.de.sentry.io/api/42/envelope/');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(body);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    // Only the content type is set, so no header of the visitor can be passed on.
    expect(Object.keys(init?.headers ?? {})).toEqual(['Content-Type']);
  });

  it('refuses a body over 256 KB that comes without a Content-Length', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(64 * 1024));
    // A stream has no known length, so the request is sent chunked and only the reading can stop it.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 5; i++) controller.enqueue(chunk);
        controller.close();
      },
    });

    const res = await fetch(`${baseUrl}/api/report`, {
      method: 'POST',
      headers: { origin: 'https://mahasamut.app', 'x-real-ip': IP },
      body,
      duplex: 'half',
    } as RequestInit);

    expect(res.status).toBe(413);
    expect(sentry).not.toHaveBeenCalled();
  });

  it('refuses a body over 256 KB', async () => {
    const res = await post('x'.repeat(256 * 1024 + 1));

    expect(res.status).toBe(413);
    expect(sentry).not.toHaveBeenCalled();
  });

  it('says 502 when Sentry cannot be reached, without the IP in the log', async () => {
    sentry.mockRejectedValueOnce(new Error(`connect ECONNREFUSED ${IP}`));
    sentry.mockResolvedValueOnce(new Response('{}', { status: 500 }));

    const unreachable = await post(envelope('report'));
    const failing = await post(envelope('report'));
    const refused = await post('{broken');

    expect(unreachable.status).toBe(502);
    expect(failing.status).toBe(502);
    expect(refused.status).toBe(400);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).not.toContain(IP);
  });

  it('limits a visitor by the address the proxy gives', async () => {
    for (let i = 0; i < 3; i++) expect((await post(envelope('error'))).status).toBe(200);

    expect((await post(envelope('error'))).status).toBe(429);
    expect((await post(envelope('error'), { 'x-real-ip': '198.51.100.24' })).status).toBe(200);
    expect(lines.join('\n')).not.toContain(IP);
  });
});
