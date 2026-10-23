/**
 * Reports the server's own errors to Sentry, and one event when the contact
 * form's delivery fails. It only starts when `SENTRY_DSN` is set: development
 * and the tests send nothing. Node loads this file as it is, by stripping its
 * types: no enums, no namespaces, no parameter properties.
 */
import * as Sentry from '@sentry/node';
import type { NodeOptions } from '@sentry/node';

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
 * tracing and no session.
 */
export function createServerMonitoring(
  env: NodeJS.ProcessEnv,
  sdk: MonitoringSdk = Sentry,
): ServerMonitoring {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return noopMonitoring;

  sdk.init({
    dsn,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    environment: 'production',
    defaultIntegrations: false,
    integrations: [
      Sentry.dedupeIntegration(),
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
