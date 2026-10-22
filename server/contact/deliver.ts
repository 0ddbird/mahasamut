/**
 * Delivery of one Mail by its transport (Resend in production), retried once
 * after a second when the failure is transient. Node loads this file as it is, by stripping its
 * types: no enums, no namespaces, no parameter properties.
 */
import type { Mail } from './mail.ts';
import type { Transport, TransportName } from './transports.ts';

/** How long to wait before retrying after a transient failure. */
const RETRY_DELAY_MS = 1000;

/**
 * How a delivery ended. When nothing sent, `codes` are the codes of each
 * attempt, in order: one for a permanent failure, two after a retry.
 */
export type DeliverResult = { ok: true; via: TransportName } | { ok: false; codes: string[] };

/** What `deliver` needs; `attemptMs` is the timeout of each single send. */
export interface DeliverDeps {
  transport: Transport;
  wait: (ms: number) => Promise<void>;
  attemptMs: number;
}

/**
 * Sends `mail` by the transport, once more after a second if the failure is
 * transient; a permanent failure stops at once. Each attempt has its own
 * timeout.
 */
export async function deliver(mail: Mail, deps: DeliverDeps): Promise<DeliverResult> {
  const { transport, wait, attemptMs } = deps;
  const attempt = () => transport.send(mail, AbortSignal.timeout(attemptMs));

  const first = await attempt();
  if (first.ok) return { ok: true, via: transport.name };
  if (!first.transient) return { ok: false, codes: [first.code] };

  await wait(RETRY_DELAY_MS);
  const second = await attempt();
  if (second.ok) return { ok: true, via: transport.name };
  return { ok: false, codes: [first.code, second.code] };
}
