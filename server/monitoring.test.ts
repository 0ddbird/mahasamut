import type { ErrorEvent, Event, NodeOptions } from '@sentry/node';
import { describe, expect, it, vi } from 'vitest';
import { buildMail } from './contact/mail.ts';
import { createServerMonitoring, noopMonitoring } from './monitoring.ts';
import type { MonitoringSdk } from './monitoring.ts';

const DSN = 'https://public@o1.ingest.de.sentry.io/42';

/** A stand-in for the SDK that only records what it is given. */
function fakeSdk() {
  return {
    init: vi.fn<MonitoringSdk['init']>(),
    captureException: vi.fn<MonitoringSdk['captureException']>(),
    captureEvent: vi.fn<MonitoringSdk['captureEvent']>(),
  };
}

describe('createServerMonitoring', () => {
  it('stays off without SENTRY_DSN', () => {
    const sdk = fakeSdk();
    const monitoring = createServerMonitoring({ SENTRY_RELEASE: 'abc123' }, sdk);

    monitoring.captureError(new Error('boom'), { handler: 'contact' });
    monitoring.contactSendFailed(['timeout'], 'resend');

    expect(monitoring.enabled).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(sdk.captureEvent).not.toHaveBeenCalled();
  });

  it('stays off with an empty SENTRY_DSN', () => {
    const sdk = fakeSdk();
    expect(createServerMonitoring({ SENTRY_DSN: '' }, sdk).enabled).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('starts the SDK with the DSN, the release and nothing personal', () => {
    const sdk = fakeSdk();
    const monitoring = createServerMonitoring({ SENTRY_DSN: DSN, SENTRY_RELEASE: 'abc123' }, sdk);

    expect(monitoring.enabled).toBe(true);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    const options = sdk.init.mock.calls[0][0]!;
    expect(options).toMatchObject({
      dsn: DSN,
      release: 'abc123',
      environment: 'production',
      defaultIntegrations: false,
      sendClientReports: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
    });
    // No tracing: no sample rate and no sampler.
    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options).not.toHaveProperty('tracesSampler');
    // Uncaught exceptions and rejections are reported; nothing reads requests, locals or the console.
    const names = (options.integrations as { name: string }[]).map(
      (integration) => integration.name,
    );
    expect(names).toEqual(expect.arrayContaining(['OnUncaughtException', 'OnUnhandledRejection']));
    for (const name of [
      'Http',
      'RequestData',
      'Console',
      'LocalVariables',
      'LocalVariablesAsync',
      // Dedupe would hide repeats that the daily cap already bounds.
      'Dedupe',
    ]) {
      expect(names).not.toContain(name);
    }
  });

  it('leaves the release to the SDK when SENTRY_RELEASE is not set', () => {
    const sdk = fakeSdk();
    createServerMonitoring({ SENTRY_DSN: DSN }, sdk);
    expect(sdk.init.mock.calls[0][0]).not.toHaveProperty('release');
  });

  it('hands a caught error to the SDK with its tags', () => {
    const sdk = fakeSdk();
    const monitoring = createServerMonitoring({ SENTRY_DSN: DSN }, sdk);
    const error = new Error('boom');

    monitoring.captureError(error, { handler: 'contact' });
    monitoring.captureError(error);

    expect(sdk.captureException.mock.calls).toEqual([
      [error, { tags: { handler: 'contact' } }],
      [error, undefined],
    ]);
  });

  it('reports a failed contact delivery with its codes only', () => {
    const sdk = fakeSdk();
    const monitoring = createServerMonitoring({ SENTRY_DSN: DSN }, sdk);
    const mail = buildMail(
      {
        email: 'visitor@example.org',
        subject: 'A question about tones',
        message: 'Hello, how do I practise the falling tone?',
      },
      'owner@example.com',
    );

    monitoring.contactSendFailed(['timeout', 'http-503'], 'resend');

    // Exactly these fields: no stack trace, no request, no user.
    expect(sdk.captureEvent.mock.calls).toEqual([
      [
        {
          level: 'error',
          message: 'Contact: sending failed',
          fingerprint: ['contact', 'send-failed'],
          extra: { codes: ['timeout', 'http-503'], transport: 'resend' },
        },
      ],
    ]);
    const sent = JSON.stringify(sdk.captureEvent.mock.calls);
    for (const value of [mail.text, mail.subject, mail.from, mail.to, mail.replyTo]) {
      expect(sent).not.toContain(value);
    }
    expect(sdk.captureException).not.toHaveBeenCalled();
  });
});

describe('the daily cap of server events', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  // 23:59 UTC, so that one minute later is the next day.
  const LATE = Date.UTC(2026, 9, 23, 23, 59);

  /** A stand-in that, like the SDK, runs each event through the `beforeSend` it was started with. */
  function sendingSdk() {
    const sent: Event[] = [];
    let beforeSend: NodeOptions['beforeSend'];
    const pass = (event: Event) => {
      const kept = beforeSend ? beforeSend(event as ErrorEvent, {}) : event;
      if (kept) sent.push(kept as Event);
    };
    const sdk: MonitoringSdk = {
      init: (options) => {
        beforeSend = options.beforeSend;
      },
      captureException: (error) => {
        const { name, message } = error as Error;
        pass({ exception: { values: [{ type: name, value: message }] } });
      },
      captureEvent: (event) => pass(event),
    };
    return { sdk, sent, pass };
  }

  function setUp(env: NodeJS.ProcessEnv = { SENTRY_DSN: DSN }) {
    const clock = { now: LATE };
    const lines: string[] = [];
    const { sdk, sent, pass } = sendingSdk();
    const monitoring = createServerMonitoring(env, sdk, {
      now: () => clock.now,
      log: (line) => lines.push(line),
    });
    return { monitoring, sent, pass, clock, lines };
  }

  it('sends at most 100 events a UTC day, then again the next day', () => {
    const { monitoring, sent, clock, lines } = setUp();

    for (let i = 0; i < 100; i++) monitoring.captureError(new Error(`error ${i}`));
    expect(sent).toHaveLength(100);

    monitoring.captureError(new Error('error 100'));
    monitoring.captureError(new Error('error 101'));
    expect(sent).toHaveLength(100);
    // One line the first time the cap is hit, with nothing of the events.
    expect(lines).toEqual(['monitoring: 100 server events today, dropping the rest of the day']);

    clock.now = LATE + 60_000;
    monitoring.captureError(new Error('error 102'));
    expect(sent).toHaveLength(101);

    for (let i = 0; i < 101; i++) monitoring.captureError(new Error(`next day ${i}`));
    expect(lines).toHaveLength(2);
  });

  it('counts the failed contact sends toward the same cap', () => {
    const { monitoring, sent } = setUp();

    for (let i = 0; i < 95; i++) monitoring.captureError(new Error(`error ${i}`));
    for (let i = 0; i < 5; i++) monitoring.contactSendFailed(['timeout'], 'resend');
    expect(sent).toHaveLength(100);

    monitoring.captureError(new Error('one more'));
    expect(sent).toHaveLength(100);
  });

  it('sends at most 10 of the same error a day', () => {
    const { monitoring, sent, clock, lines } = setUp();

    for (let i = 0; i < 12; i++) monitoring.captureError(new Error('the same'));
    for (let i = 0; i < 12; i++) monitoring.contactSendFailed(['network'], 'resend');
    monitoring.captureError(new Error('another'));

    expect(sent).toHaveLength(21);
    expect(lines).toEqual([]);

    clock.now += DAY_MS;
    monitoring.captureError(new Error('the same'));
    expect(sent).toHaveLength(22);
  });

  it('caps the events the SDK raises by itself too, such as an uncaught exception', () => {
    const { sent, pass } = setUp();

    for (let i = 0; i < 12; i++) {
      pass({ level: 'fatal', exception: { values: [{ type: 'Error', value: 'uncaught' }] } });
    }

    expect(sent).toHaveLength(10);
  });

  it('changes nothing without a DSN', () => {
    const { monitoring, sent, lines } = setUp({});

    for (let i = 0; i < 200; i++) monitoring.captureError(new Error(`error ${i}`));

    expect(monitoring.enabled).toBe(false);
    expect(sent).toEqual([]);
    expect(lines).toEqual([]);
  });
});

describe('noopMonitoring', () => {
  it('is off and does nothing', () => {
    expect(noopMonitoring.enabled).toBe(false);
    expect(() => noopMonitoring.captureError(new Error('boom'))).not.toThrow();
    expect(() => noopMonitoring.contactSendFailed(['network'], 'console')).not.toThrow();
  });
});
