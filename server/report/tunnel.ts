/**
 * The report tunnel: the site sends its Sentry envelopes (JavaScript errors and
 * question reports) to our own server, which checks that they belong to the
 * site's Sentry project, spends the budget of their kind, and forwards them to
 * Sentry. Ad blockers block sentry.io, and Sentry sees our server's address
 * instead of the visitor's: nothing of the visitor is passed on, and the IP only
 * serves, in memory, to share out the budgets. Node loads this file as it is, by
 * stripping its types: no enums, no namespaces, no parameter properties.
 */
import type { createBudgets } from './budgets.ts';
import { readEnvelope } from './envelope.ts';
import type { ParsedDsn } from './envelope.ts';

/** The largest envelope accepted: the SDK's are a few KB, and a report holds a comment of 1000 characters. */
export const MAX_REPORT_BODY_BYTES = 256 * 1024;

export interface ReportRequest {
  method: string;
  origin: string | undefined;
  /** Only for the budgets; it is never forwarded nor logged. */
  ip: string;
  body: string;
}

export interface ReportTunnelDeps {
  /** The DSN of the site's Sentry project; without it the tunnel is off. */
  siteDsn: ParsedDsn | null;
  /** The only origin a request may come from. */
  origin: string;
  budgets: ReturnType<typeof createBudgets>;
  /** Posts the envelope to the URL, with no header of the visitor, and gives Sentry's status. */
  forward: (url: string, body: string) => Promise<number>;
  /** Where the tunnel says what went wrong at Sentry's end. Never given the IP. */
  log?: (line: string) => void;
}

/**
 * Creates the tunnel as a function of the request, which answers with the status
 * for the site: 405 for a method other than POST, 403 for another origin, 404
 * when the tunnel is off, 400 for an envelope that cannot be read, 403 for an
 * envelope of another project or host, 200 without forwarding for what is
 * neither an error nor a report, 429 when the budget of its kind is spent, then
 * 200 if Sentry took it and 502 if not.
 */
export function createReportTunnel(
  deps: ReportTunnelDeps,
): (request: ReportRequest) => Promise<{ status: number }> {
  const { siteDsn, origin, budgets, forward, log = () => {} } = deps;

  return async (request) => {
    if (request.method !== 'POST') return { status: 405 };
    if (request.origin !== origin) return { status: 403 };
    if (!siteDsn) return { status: 404 };

    const envelope = readEnvelope(request.body);
    if (!envelope) return { status: 400 };
    if (envelope.dsn.host !== siteDsn.host || envelope.dsn.projectId !== siteDsn.projectId) {
      return { status: 403 };
    }
    // Sessions, client reports and the like are not passed on: they would eat the quota.
    if (envelope.kind === 'other') return { status: 200 };
    if (!budgets.take(envelope.kind, request.ip)) return { status: 429 };

    // The URL comes from our configuration, never from the envelope.
    const url = `https://${siteDsn.host}/api/${siteDsn.projectId}/envelope/`;
    try {
      const status = await forward(url, request.body);
      if (status >= 200 && status < 300) return { status: 200 };
      log(`report: Sentry answered ${status}`);
    } catch {
      // Only the fact is logged: the error is not ours to vouch for.
      log('report: Sentry could not be reached');
    }
    return { status: 502 };
  };
}
