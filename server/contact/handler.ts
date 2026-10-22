/**
 * The checks a contact request goes through before it is sent, in order:
 * the shape of the request, the robot traps, the limits, the content of the
 * message, then the delivery. It touches no network itself: everything it
 * needs comes in through `deps`. Node loads this file as it is, by stripping
 * its types: no enums, no namespaces, no parameter properties.
 */
import { checkContact, normalizeDraft } from '../../src/contact/rules.ts';
import type { ContactPayload, ContactReply } from '../../src/contact/rules.ts';
import type { DeliverResult } from './deliver.ts';
import { ipKey } from './limits.ts';
import type { createLimits } from './limits.ts';
import { buildMail } from './mail.ts';
import type { Mail } from './mail.ts';

/** A form filled in faster than this was not filled in by a person. */
const MIN_ELAPSED_MS = 3000;

/** What the HTTP layer hands over; `ip` is already the visitor's address. */
export interface ContactRequest {
  method: string;
  contentType: string | undefined;
  origin: string | undefined;
  ip: string;
  body: string;
}

/** What the HTTP layer sends back. */
export interface ContactResponse {
  status: number;
  reply: ContactReply;
}

/** What the handler needs: the allowed origin, the owner, and its collaborators. */
export interface ContactHandlerDeps {
  /** The only origin a request may come from, compared as an exact string. */
  origin: string;
  /** Where the messages go. */
  to: string;
  limits: ReturnType<typeof createLimits>;
  send: (mail: Mail) => Promise<DeliverResult>;
  alerter: { notify(code: string): Promise<void> };
  /** Receives one line per decision, never the content, the addresses or the IP. */
  log: (line: string) => void;
}

/** The body as a payload, or undefined when it is not JSON or a field has the wrong type. */
function parsePayload(body: string): ContactPayload | undefined {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (typeof data !== 'object' || data === null) return undefined;
  const { email, subject, message, website, elapsedMs } = data as Record<string, unknown>;
  if (
    typeof email !== 'string' ||
    typeof subject !== 'string' ||
    typeof message !== 'string' ||
    typeof website !== 'string' ||
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs)
  ) {
    return undefined;
  }
  return { email, subject, message, website, elapsedMs };
}

/** A refusal: the request is not one this service answers. */
function refused(status: number): ContactResponse {
  return { status, reply: { result: 'refused' } };
}

/**
 * Creates the handler of `POST /contact`. A honeypot or too-fast message is
 * answered `sent` and dropped, so a robot learns nothing. A place in the limits
 * is taken before anything is awaited, so parallel requests cannot pass the
 * limits together, and given back when the message is invalid or not sent.
 */
export function createContactHandler(
  deps: ContactHandlerDeps,
): (request: ContactRequest) => Promise<ContactResponse> {
  const { origin, to, limits, send, alerter, log } = deps;

  return async (request) => {
    if (request.method !== 'POST') return refused(405);
    if (!request.contentType?.startsWith('application/json')) return refused(415);
    if (request.origin !== origin) return refused(403);
    const payload = parsePayload(request.body);
    if (!payload) return refused(400);

    if (payload.website !== '') {
      log('contact: dropped (honeypot)');
      return { status: 200, reply: { result: 'sent' } };
    }
    if (payload.elapsedMs < MIN_ELAPSED_MS) {
      log('contact: dropped (too fast)');
      return { status: 200, reply: { result: 'sent' } };
    }

    const reservation = limits.reserve(ipKey(request.ip));
    if (typeof reservation === 'string') {
      log(`contact: limited (${reservation})`);
      return { status: 429, reply: { result: 'limited', scope: reservation } };
    }

    const fields = checkContact(payload);
    const invalid = Object.keys(fields);
    if (invalid.length > 0) {
      reservation.cancel();
      log(`contact: invalid (${invalid.join(',')})`);
      return { status: 400, reply: { result: 'invalid', fields } };
    }

    const result = await send(buildMail(normalizeDraft(payload), to));
    if (!result.ok) {
      reservation.cancel();
      log(`contact: failed (${result.codes.join(', ')})`);
      return { status: 502, reply: { result: 'failed' } };
    }

    log(
      result.primaryCode === undefined
        ? `contact: sent via ${result.via}`
        : `contact: sent via ${result.via} (resend: ${result.primaryCode})`,
    );
    if (result.primaryCode !== undefined) void alerter.notify(result.primaryCode);
    return { status: 200, reply: { result: 'sent' } };
  };
}
