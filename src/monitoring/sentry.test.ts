import * as Sentry from '@sentry/react';
import { describe, expect, it, vi } from 'vitest';
import { initMonitoring, REPORT_TUNNEL } from './sentry';

type Integration = ReturnType<typeof Sentry.getDefaultIntegrations>[number];

// A DSN that points nowhere: nothing in these tests can reach a real project.
const DSN = 'https://public@o1.ingest.de.sentry.io/42';

/** A stand-in for the SDK, and the loader that hands it over like `import('@sentry/react')`. */
const fakeLoader = () => {
  const sdk = { init: vi.fn(), captureException: vi.fn() };
  return { sdk, load: vi.fn(() => Promise.resolve(sdk)) };
};

/** The options the site gave `init`, once the SDK is loaded. */
const initOptions = async (sdk: { init: ReturnType<typeof vi.fn> }) => {
  await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledOnce());
  return sdk.init.mock.calls[0][0];
};

describe('initMonitoring', () => {
  it('does nothing without a DSN, and does not even load the SDK', () => {
    const { sdk, load } = fakeLoader();

    expect(initMonitoring({ mode: 'production' }, load)).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it.each(['test', 'development'])(
    'does nothing in %s mode even with a DSN, and does not load the SDK',
    (mode) => {
      const { sdk, load } = fakeLoader();

      expect(initMonitoring({ dsn: DSN, mode }, load)).toBe(false);
      expect(load).not.toHaveBeenCalled();
      expect(sdk.init).not.toHaveBeenCalled();
    },
  );

  it('sends through the tunnel, without personal data or tracing', async () => {
    const { sdk, load } = fakeLoader();

    expect(initMonitoring({ dsn: DSN, release: 'abc123', mode: 'production' }, load)).toBe(true);

    const options = await initOptions(sdk);
    expect(options).toMatchObject({
      dsn: DSN,
      tunnel: REPORT_TUNNEL,
      dataCollection: { userInfo: false, cookies: false, urlQueryParams: false },
      sendClientReports: false,
      release: 'abc123',
      environment: 'production',
      initialScope: { tags: { kind: 'error' } },
    });
    expect(REPORT_TUNNEL).toBe('/api/report');
    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
  });

  it('only reports errors raised by the site own scripts', async () => {
    const { sdk, load } = fakeLoader();
    initMonitoring({ dsn: DSN, mode: 'production' }, load);

    const { allowUrls } = await initOptions(sdk);
    const allowed = (url: string) => allowUrls.some((pattern: RegExp) => pattern.test(url));
    expect(allowed('https://mahasamut.app/assets/index.js')).toBe(true);
    expect(allowed('chrome-extension://x/y.js')).toBe(false);
  });

  it('drops the session integration and adds no tracing or replay', async () => {
    const { sdk, load } = fakeLoader();
    initMonitoring({ dsn: DSN, mode: 'production' }, load);

    const options = await initOptions(sdk);
    const integrations: (defaults: Integration[]) => Integration[] = options.integrations;
    // The test is only worth something if the SDK really ships that integration by default.
    const defaults = Sentry.getDefaultIntegrations({});
    expect(defaults.map((integration) => integration.name)).toContain('BrowserSession');

    const names = integrations(defaults).map((integration) => integration.name);
    expect(names).not.toContain('BrowserSession');
    expect(names).not.toContain('BrowserTracing');
    expect(names).not.toContain('Replay');
    expect(names.length).toBe(defaults.length - 1);
  });

  it('keeps the browser but not the page the visitor came from', async () => {
    const { sdk, load } = fakeLoader();
    initMonitoring({ dsn: DSN, mode: 'production' }, load);

    const { beforeSend } = await initOptions(sdk);
    const event = {
      request: {
        url: 'https://mahasamut.app/',
        headers: { 'User-Agent': 'Firefox', Referer: 'https://elsewhere.example/page' },
      },
    };

    expect(beforeSend(event).request.headers).toEqual({ 'User-Agent': 'Firefox' });
    expect(beforeSend({ message: 'no request' })).toEqual({ message: 'no request' });
  });
});

describe('reportError', () => {
  // The module keeps what it loaded: each test starts from a fresh copy.
  const freshModule = async () => {
    vi.resetModules();
    return import('./sentry');
  };

  it('does nothing while monitoring is off', async () => {
    const { reportError } = await freshModule();

    expect(() => reportError(new Error('boom'))).not.toThrow();
  });

  it('hands the error to the SDK once it is loaded, even if it was raised meanwhile', async () => {
    const { initMonitoring, reportError } = await freshModule();
    const { sdk, load } = fakeLoader();
    initMonitoring({ dsn: DSN, mode: 'production' }, load);
    const error = new Error('boom');

    reportError(error, { componentStack: '\n    at Broken' });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledOnce());
    expect(sdk.init).toHaveBeenCalledBefore(sdk.captureException);
    expect(sdk.captureException).toHaveBeenCalledWith(error, {
      contexts: { react: { componentStack: '\n    at Broken' } },
    });
  });
});
