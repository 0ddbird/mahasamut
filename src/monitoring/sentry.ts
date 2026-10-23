import * as Sentry from '@sentry/react';

/**
 * Where the site sends what it reports. The tunnel is on our own server, so the
 * browser never talks to Sentry directly and an ad blocker has nothing to block.
 */
export const REPORT_TUNNEL = '/api/report';

/** What the build knows, read from `import.meta.env`. */
export interface MonitoringEnv {
  /** The DSN of the Sentry project. Builds made without one do not report. */
  dsn?: string;
  /** The version of the site, so that an error points at the code that raised it. */
  release?: string;
  /** Vite's `MODE`. */
  mode: string;
}

/** The part of the SDK used here: injected by the tests, and kept narrow so that the rest can be tree-shaken. */
type Sdk = Pick<typeof Sentry, 'init'>;

/** The DSN of this build, if any. Question reports go to the same project. */
export function siteDsn(): string | undefined {
  return import.meta.env.VITE_SENTRY_DSN || undefined;
}

/**
 * Starts reporting the site's JavaScript errors, and returns whether it did.
 *
 * Only a production build with a DSN reports: tests and the dev server stay
 * silent. Nothing personal is collected (no default PII, no sessions, no client
 * reports, no tracing, no Replay).
 */
export function initMonitoring(env: MonitoringEnv, sdk: Sdk = { init: Sentry.init }): boolean {
  if (!env.dsn || env.mode !== 'production') return false;

  sdk.init({
    dsn: env.dsn,
    tunnel: REPORT_TUNNEL,
    // 11.x replaced `sendDefaultPii` by `dataCollection`: no user, IP, cookie or query string leaves the browser.
    dataCollection: { userInfo: false, cookies: false, urlQueryParams: false },
    release: env.release,
    environment: 'production',
    // Browser extensions and injected scripts raise errors that are none of ours.
    allowUrls: [/^https:\/\/mahasamut\.app\//],
    // Tells apart an error from a question report in the same project.
    initialScope: { tags: { kind: 'error' } },
    sendClientReports: false,
    // The session integration counts visits, which this site does not do.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== 'BrowserSession'),
  });
  return true;
}
