import type * as Sentry from './sdk';
import type { ErrorInfo } from 'react';

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

/** The part of the SDK used here. */
type Sdk = Pick<typeof Sentry, 'init' | 'captureException'>;

/**
 * Brings the SDK in. It is a dynamic import so that the SDK, which is about as
 * heavy as the rest of the site, is its own chunk and is only fetched when the
 * monitoring is on. It loads `./sdk`, not the whole package, so that only the
 * functions used are bundled. Tests pass a stand-in.
 */
type LoadSdk = () => Promise<Sdk>;

/** The SDK once started, or `undefined` if it could not be loaded. Unset while the monitoring is off. */
let started: Promise<Sdk | undefined> | undefined;

/**
 * The DSN of this build, if any. Question reports go to the same project. Only a
 * production build has one, so that errors and reports follow the same rule: the
 * dev server and the tests send nothing, even if a DSN is set in their environment.
 */
export function siteDsn(): string | undefined {
  if (import.meta.env.MODE !== 'production') return undefined;
  return import.meta.env.VITE_SENTRY_DSN || undefined;
}

/**
 * Whether question reports can be made. A production build without a DSN has
 * nowhere to send them, so it offers no way to make one rather than thank the
 * player for a report that is lost. The dev server and the tests keep the window
 * working: the report is logged there.
 */
export function reportsEnabled(): boolean {
  return import.meta.env.MODE !== 'production' || siteDsn() !== undefined;
}

/**
 * Starts reporting the site's JavaScript errors, and returns whether it will.
 *
 * Only a production build with a DSN reports: tests and the dev server stay
 * silent, and then the SDK is not even loaded. Nothing personal is collected (no
 * user, cookies, query strings or referrer, no sessions, no client reports, no
 * tracing, no Replay). The SDK is loaded and started in the background.
 */
export function initMonitoring(
  env: MonitoringEnv,
  load: LoadSdk = () => import('./sdk'),
): boolean {
  if (!env.dsn || env.mode !== 'production') return false;

  const dsn = env.dsn;
  started = load()
    .then((sdk) => {
      sdk.init({
        dsn,
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
        // The browser stays, for debugging; the page the visitor came from can name another site.
        beforeSend: (event) => {
          const headers = event.request?.headers;
          if (headers) {
            for (const name of Object.keys(headers)) {
              if (name.toLowerCase() === 'referer') delete headers[name];
            }
          }
          return event;
        },
      });
      return sdk;
    })
    // A failed load (offline, blocked) leaves nowhere to report it: the site just goes on unmonitored.
    .catch(() => undefined);
  return true;
}

/**
 * Hands an error caught by the error boundary to Sentry. It waits for the SDK if
 * it is still loading, and does nothing when the monitoring is off.
 */
export function reportError(error: unknown, info?: Pick<ErrorInfo, 'componentStack'>): void {
  void started?.then((sdk) =>
    sdk?.captureException(
      error,
      info?.componentStack
        ? { contexts: { react: { componentStack: info.componentStack } } }
        : undefined,
    ),
  );
}
