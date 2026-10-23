import * as Sentry from '@sentry/react';
import { describe, expect, it, vi } from 'vitest';
import { initMonitoring, REPORT_TUNNEL } from './sentry';

type Integration = ReturnType<typeof Sentry.getDefaultIntegrations>[number];

// A DSN that points nowhere: nothing in these tests can reach a real project.
const DSN = 'https://public@o1.ingest.de.sentry.io/42';

const fakeSdk = () => ({ init: vi.fn() });

describe('initMonitoring', () => {
  it('does nothing without a DSN', () => {
    const sdk = fakeSdk();

    expect(initMonitoring({ mode: 'production' }, sdk)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it.each(['test', 'development'])('does nothing in %s mode even with a DSN', (mode) => {
    const sdk = fakeSdk();

    expect(initMonitoring({ dsn: DSN, mode }, sdk)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('sends through the tunnel, without personal data or tracing', () => {
    const sdk = fakeSdk();

    expect(initMonitoring({ dsn: DSN, release: 'abc123', mode: 'production' }, sdk)).toBe(true);

    expect(sdk.init).toHaveBeenCalledOnce();
    const options = sdk.init.mock.calls[0][0];
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

  it('only reports errors raised by the site own scripts', () => {
    const sdk = fakeSdk();
    initMonitoring({ dsn: DSN, mode: 'production' }, sdk);

    const allowed = (url: string) =>
      sdk.init.mock.calls[0][0].allowUrls.some((pattern: RegExp) => pattern.test(url));
    expect(allowed('https://mahasamut.app/assets/index.js')).toBe(true);
    expect(allowed('chrome-extension://x/y.js')).toBe(false);
  });

  it('drops the session integration and adds no tracing or replay', () => {
    const sdk = fakeSdk();
    initMonitoring({ dsn: DSN, mode: 'production' }, sdk);

    const integrations: (defaults: Integration[]) => Integration[] =
      sdk.init.mock.calls[0][0].integrations;
    // The test is only worth something if the SDK really ships that integration by default.
    const defaults = Sentry.getDefaultIntegrations({});
    expect(defaults.map((integration) => integration.name)).toContain('BrowserSession');

    const names = integrations(defaults).map((integration) => integration.name);
    expect(names).not.toContain('BrowserSession');
    expect(names).not.toContain('BrowserTracing');
    expect(names).not.toContain('Replay');
    expect(names.length).toBe(defaults.length - 1);
  });
});
