/**
 * Reports the server's own errors to Sentry, and one event when the contact
 * form's delivery fails. It only starts when `SENTRY_DSN` is set: development
 * and the tests send nothing. Node loads this file as it is, by stripping its
 * types: no enums, no namespaces, no parameter properties.
 */
import * as Sentry from '@sentry/node';
import type { Event, NodeOptions } from '@sentry/node';

/**
 * The most events the server sends in a UTC day, all kinds together. The Sentry
 * quota is shared with the site's errors and reports: a crash loop must not empty it.
 */
export const MAX_EVENTS_PER_DAY = 100;
/** The most events of one kind (the same fingerprint, or else the same error) in a UTC day. */
export const MAX_SAME_EVENTS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What the server reports through. */
export interface ServerMonitoring {
  /** Whether anything is sent at all. */
  enabled: boolean;
  /** Hands an error caught by a handler to Sentry, with tags that say where. */
  captureError(error: unknown, tags?: Record<string, string>): void;
  /** Says that a contact message could not be sent, with only the codes of each attempt. */
  contactSendFailed(codes: readonly string[], transport: string): void;
}

/** The part of the SDK used here. Tests pass a stand-in. */
export interface MonitoringSdk {
  init(options: NodeOptions): unknown;
  captureException(error: unknown, hint?: { tags: Record<string, string> }): unknown;
  captureEvent(event: {
    level: 'error';
    message: string;
    fingerprint: string[];
    extra: Record<string, unknown>;
  }): unknown;
}

/** What the monitoring runs with besides the SDK. */
export interface MonitoringOptions {
  /** The clock of the daily cap. */
  now?: () => number;
  /** Receives one line the first time in a day that the cap is reached. */
  log?: (line: string) => void;
}

/**
 * What tells events of one kind apart: the fingerprint, or else the first
 * exception, or else the message. It stays in memory and is never logged.
 */
function eventKey(event: Event): string {
  if (event.fingerprint?.length) return `fingerprint:${event.fingerprint.join('/')}`;
  const exception = event.exception?.values?.[0];
  if (exception) return `exception:${exception.type ?? ''}:${exception.value ?? ''}`;
  return `message:${event.message ?? ''}`;
}

/**
 * Keeps the events of a UTC day within the caps, and says whether `event` may go.
 * The counts start again at midnight UTC; only events that went are counted, so
 * at most `MAX_EVENTS_PER_DAY` kinds are held.
 */
function createDailyCap(now: () => number, log: (line: string) => void): (event: Event) => boolean {
  let day = -1;
  let total = 0;
  let perKind = new Map<string, number>();
  let told = false;

  return (event) => {
    const today = Math.floor(now() / DAY_MS);
    if (today !== day) {
      day = today;
      total = 0;
      perKind = new Map();
      told = false;
    }
    if (total >= MAX_EVENTS_PER_DAY) {
      if (!told) {
        told = true;
        log(`monitoring: ${MAX_EVENTS_PER_DAY} server events today, dropping the rest of the day`);
      }
      return false;
    }
    const key = eventKey(event);
    const same = perKind.get(key) ?? 0;
    if (same >= MAX_SAME_EVENTS_PER_DAY) return false;
    perKind.set(key, same + 1);
    total += 1;
    return true;
  };
}

/** Monitoring that sends nothing, for development and the tests. */
export const noopMonitoring: ServerMonitoring = {
  enabled: false,
  captureError: () => {},
  contactSendFailed: () => {},
};

/**
 * Starts reporting to the project of `SENTRY_DSN`, or returns `noopMonitoring`
 * without it. Uncaught exceptions and rejections are reported, then end the
 * process as Node would. Nothing personal is collected: only the integrations
 * listed here run, so nothing reads the requests (the IP, the headers, the
 * message of a contact), the console or the local variables, and there is no
 * tracing and no session. Every event, the uncaught ones included, goes through
 * the daily cap; beyond it, events are dropped without a word to Sentry.
 */
export function createServerMonitoring(
  env: NodeJS.ProcessEnv,
  sdk: MonitoringSdk = Sentry,
  options: MonitoringOptions = {},
): ServerMonitoring {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return noopMonitoring;
  const withinCap = createDailyCap(
    options.now ?? Date.now,
    options.log ?? ((line) => console.log(line)),
  );

  sdk.init({
    dsn,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    environment: 'production',
    defaultIntegrations: false,
    // No Dedupe: it would drop every repeat of the same failure in a row, while the
    // daily cap already bounds them and lets Sentry count them up to its limit.
    integrations: [
      Sentry.linkedErrorsIntegration(),
      Sentry.nodeContextIntegration(),
      Sentry.contextLinesIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      // Node's own default for an unhandled rejection is to stop: keep it that way.
      Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
    ],
    // 11.x replaced `sendDefaultPii` by `dataCollection`: the same "nothing personal", one kind of data at a time.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    sendClientReports: false,
    // The listed integrations need no module hooks.
    enableRuntimeChannelInjection: false,
    beforeSend: (event) => (withinCap(event) ? event : null),
  });

  return {
    enabled: true,
    captureError(error, tags) {
      sdk.captureException(error, tags ? { tags } : undefined);
    },
    contactSendFailed(codes, transport) {
      // An event rather than a message, which would carry a stack trace of no use here.
      // One fixed fingerprint gathers every outage in one issue.
      sdk.captureEvent({
        level: 'error',
        message: 'Contact: sending failed',
        fingerprint: ['contact', 'send-failed'],
        extra: { codes: [...codes], transport },
      });
    },
  };
}
