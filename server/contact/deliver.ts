/**
 * Delivery of one Mail: Resend first, retried once after a second when the
 * failure is transient, then Brevo. Node loads this file as it is, by
 * stripping its types: no enums, no namespaces, no parameter properties.
 */
import type { Mail } from './mail.ts';
import type { Transport, TransportName } from './transports.ts';

/** How long to wait before retrying the primary transport. */
const RETRY_DELAY_MS = 1000;

/**
 * How a delivery ended. When Brevo sent after Resend failed, `primaryCode` is
 * the code of Resend's last failure. When nothing sent, `codes` are the
 * primary's and the fallback's last failures, in that order.
 */
export type DeliverResult =
  { ok: true; via: TransportName; primaryCode?: string } | { ok: false; codes: string[] };

/** What `deliver` needs; `attemptMs` is the timeout of each single send. */
export interface DeliverDeps {
  primary: Transport;
  fallback: Transport;
  wait: (ms: number) => Promise<void>;
  attemptMs: number;
}

/**
 * Sends `mail` by the primary transport, once more after a second if the
 * failure is transient, and by the fallback if the primary still fails. Each
 * attempt has its own timeout.
 */
export async function deliver(mail: Mail, deps: DeliverDeps): Promise<DeliverResult> {
  const { primary, fallback, wait, attemptMs } = deps;
  const attempt = (transport: Transport) => transport.send(mail, AbortSignal.timeout(attemptMs));

  let first = await attempt(primary);
  if (first.ok) return { ok: true, via: primary.name };
  if (first.transient) {
    await wait(RETRY_DELAY_MS);
    first = await attempt(primary);
    if (first.ok) return { ok: true, via: primary.name };
  }

  const second = await attempt(fallback);
  if (second.ok) return { ok: true, via: fallback.name, primaryCode: first.code };
  return { ok: false, codes: [first.code, second.code] };
}
