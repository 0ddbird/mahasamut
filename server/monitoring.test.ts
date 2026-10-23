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

describe('noopMonitoring', () => {
  it('is off and does nothing', () => {
    expect(noopMonitoring.enabled).toBe(false);
    expect(() => noopMonitoring.captureError(new Error('boom'))).not.toThrow();
    expect(() => noopMonitoring.contactSendFailed(['network'], 'console')).not.toThrow();
  });
});
