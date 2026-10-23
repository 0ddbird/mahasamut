import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBudgets } from './budgets.ts';
import { parseDsn } from './envelope.ts';
import { createReportTunnel, MAX_REPORT_BODY_BYTES } from './tunnel.ts';

const DSN = 'https://public@o1.ingest.de.sentry.io/42';
const ORIGIN = 'https://mahasamut.app';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function envelope(type: string, kind?: string, dsn = DSN): string {
  const payload = type === 'event' ? JSON.stringify({ tags: { kind } }) : '{}';
  return [JSON.stringify({ dsn }), JSON.stringify({ type }), payload].join('\n');
}

const report = (dsn = DSN) => envelope('event', 'report', dsn);
const error = (dsn = DSN) => envelope('event', 'error', dsn);

describe('createReportTunnel', () => {
  let now = 0;
  let forward = vi.fn<(url: string, body: string) => Promise<number>>();
  let log = vi.fn<(line: string) => void>();
  let tunnel = build();

  function build(siteDsn = parseDsn(DSN)) {
    return createReportTunnel({
      siteDsn,
      origin: ORIGIN,
      budgets: createBudgets(() => now),
      forward,
      log,
    });
  }

  function send(
    body: string,
    ip = '203.0.113.7',
    overrides: { method?: string; origin?: string } = {},
  ) {
    return tunnel({
      method: overrides.method ?? 'POST',
      origin: 'origin' in overrides ? overrides.origin : ORIGIN,
      ip,
      body,
    });
  }

  beforeEach(() => {
    now = 1_000_000;
    forward = vi.fn(() => Promise.resolve(200));
    log = vi.fn();
    tunnel = build();
  });

  it("forwards an envelope of the site's project, as it is", async () => {
    const body = report();

    expect(await send(body)).toEqual({ status: 200 });

    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledWith('https://o1.ingest.de.sentry.io/api/42/envelope/', body);
  });

  it('forwards an error too', async () => {
    expect(await send(error())).toEqual({ status: 200 });

    expect(forward).toHaveBeenCalledTimes(1);
  });

  it('refuses another project or host', async () => {
    const otherProject = 'https://public@o1.ingest.de.sentry.io/43';
    const otherHost = 'https://public@o2.ingest.de.sentry.io/42';
    const elsewhere = 'https://public@evil.example.com/42';

    expect(await send(report(otherProject))).toEqual({ status: 403 });
    expect(await send(report(otherHost))).toEqual({ status: 403 });
    expect(await send(report(elsewhere))).toEqual({ status: 403 });

    expect(forward).not.toHaveBeenCalled();
  });

  it('refuses a wrong origin', async () => {
    expect(await send(report(), '203.0.113.7', { origin: 'https://evil.example.com' })).toEqual({
      status: 403,
    });
    expect(await send(report(), '203.0.113.7', { origin: undefined })).toEqual({ status: 403 });

    expect(forward).not.toHaveBeenCalled();
  });

  it('refuses what it cannot read', async () => {
    expect(await send('{broken')).toEqual({ status: 400 });
    expect(await send('')).toEqual({ status: 400 });

    expect(forward).not.toHaveBeenCalled();
  });

  it('refuses a method other than POST', async () => {
    expect(await send(report(), '203.0.113.7', { method: 'GET' })).toEqual({ status: 405 });
    expect(await send(report(), '203.0.113.7', { method: 'OPTIONS' })).toEqual({ status: 405 });

    expect(forward).not.toHaveBeenCalled();
  });

  it('is off without a DSN for the site', async () => {
    tunnel = build(null);

    expect(await send(report())).toEqual({ status: 404 });

    expect(forward).not.toHaveBeenCalled();
  });

  it('checks the method and the origin before anything else', async () => {
    tunnel = build(null);

    expect(await send(report(), '203.0.113.7', { method: 'GET' })).toEqual({ status: 405 });
    expect(await send(report(), '203.0.113.7', { origin: 'https://evil.example.com' })).toEqual({
      status: 403,
    });
  });

  it('drops sessions and client reports without counting them', async () => {
    for (let i = 0; i < 20; i++) {
      expect(await send(envelope('session'))).toEqual({ status: 200 });
      expect(await send(envelope('client_report'))).toEqual({ status: 200 });
    }
    expect(forward).not.toHaveBeenCalled();

    // The budgets are intact: a visitor can still send all of their 3 errors a minute.
    for (let i = 0; i < 3; i++) expect(await send(error())).toEqual({ status: 200 });
    expect(forward).toHaveBeenCalledTimes(3);
  });

  it('limits each kind on its own', async () => {
    for (let i = 0; i < 3; i++) expect(await send(error())).toEqual({ status: 200 });
    expect(await send(error())).toEqual({ status: 429 });
    expect(forward).toHaveBeenCalledTimes(3);

    expect(await send(report())).toEqual({ status: 200 });
    expect(forward).toHaveBeenCalledTimes(4);
  });

  it('lets a visitor send 10 reports a minute', async () => {
    for (let i = 0; i < 10; i++) expect(await send(report())).toEqual({ status: 200 });
    expect(await send(report())).toEqual({ status: 429 });
    expect(forward).toHaveBeenCalledTimes(10);

    now += DAY;

    expect(await send(report())).toEqual({ status: 200 });
  });

  it('limits the whole site', async () => {
    for (let i = 0; i < 50; i++)
      expect(await send(error(), `10.0.0.${i}`)).toEqual({ status: 200 });
    expect(await send(error(), '10.0.1.0')).toEqual({ status: 429 });

    for (let i = 0; i < 100; i++) {
      expect(await send(report(), `10.0.2.${i}`)).toEqual({ status: 200 });
    }
    expect(await send(report(), '10.0.3.0')).toEqual({ status: 429 });
  });

  it('keys IPv6 visitors by their /64', async () => {
    for (let i = 0; i < 3; i++) {
      expect(await send(error(), `2001:db8:0:0:${i + 1}::1`)).toEqual({ status: 200 });
    }

    expect(await send(error(), '2001:db8::ffff')).toEqual({ status: 429 });
    expect(await send(error(), '2001:db8:0:1::1')).toEqual({ status: 200 });
  });

  it('says when Sentry fails', async () => {
    forward.mockResolvedValueOnce(500);
    expect(await send(report())).toEqual({ status: 502 });

    forward.mockResolvedValueOnce(429);
    expect(await send(report())).toEqual({ status: 502 });

    forward.mockRejectedValueOnce(new Error('timeout'));
    expect(await send(report())).toEqual({ status: 502 });
  });

  it('says it is fine for any 2xx', async () => {
    forward.mockResolvedValueOnce(202);

    expect(await send(report())).toEqual({ status: 200 });
  });

  it('never writes the IP in the log', async () => {
    const ip = '198.51.100.23';
    forward.mockResolvedValueOnce(500);
    forward.mockRejectedValueOnce(new Error(`connect to ${ip}`));

    await send(report(), ip);
    await send(report(), ip);
    for (let i = 0; i < 12; i++) await send(report(), ip);
    await send('{broken', ip);
    await send(report(), ip, { origin: 'https://evil.example.com' });

    expect(log).toHaveBeenCalled();
    expect(log.mock.calls.flat().join('\n')).not.toContain(ip);
  });
});

describe('MAX_REPORT_BODY_BYTES', () => {
  it('is 256 KB', () => {
    expect(MAX_REPORT_BODY_BYTES).toBe(256 * 1024);
  });
});
