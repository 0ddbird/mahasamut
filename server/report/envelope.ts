/**
 * Reading the little of a Sentry envelope that the report tunnel needs: which
 * project it is for, and whether it carries a report, an error, or nothing the
 * tunnel passes on. Node loads this file as it is, by stripping its types: no
 * enums, no namespaces, no parameter properties.
 */

/** The parts of a DSN (`https://{publicKey}@{host}/{projectId}`) that matter here. */
export interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

/**
 * Reads a DSN, or says `null` for text that is not one. Only `https` is
 * accepted, since the tunnel forwards to `https://{host}/…`.
 */
export function parseDsn(dsn: string): ParsedDsn | null {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const projectId = /^\/(\d+)$/.exec(url.pathname)?.[1];
  if (url.protocol !== 'https:' || !url.username || !projectId) return null;
  return { host: url.host, projectId, publicKey: url.username };
}

/**
 * What an envelope is for the tunnel: a question 'report' (an event tagged
 * `kind: report` by the site), a JavaScript 'error' (any other event), or
 * 'other' (sessions and client reports only), which is not passed on.
 */
export type EnvelopeKind = 'report' | 'error' | 'other';

const NEWLINE = 0x0a;

/** The items that are let through as 'other', to be dropped. */
const DROPPED_TYPES = ['session', 'client_report'];

/** The JSON object in `text`, or `null` when it is anything else. */
function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The text from `from` to the end of the line, and where the next line starts. */
function readLine(bytes: Buffer, from: number): { text: string; next: number } {
  const newline = bytes.indexOf(NEWLINE, from);
  const end = newline === -1 ? bytes.length : newline;
  return { text: bytes.toString('utf8', from, end), next: end + 1 };
}

/**
 * Reads an envelope: a header line naming the DSN, then items, each an item
 * header line and a payload. The payload runs to the end of its line, unless the
 * item header gives a `length`, in which case it is exactly that many bytes and
 * may hold newlines. Returns `null` when the envelope cannot be read.
 *
 * Only the two shapes the site sends are accepted: an envelope of exactly one
 * event and nothing else, or one of sessions and client reports only (kind
 * 'other'). Anything else is refused as unreadable. The budgets count envelopes
 * and Sentry has a quota for each type of item, so an event with a hundred
 * transactions, replays or attachments beside it, or several events, would get
 * around the limits and eat the quota.
 */
export function readEnvelope(body: string): { dsn: ParsedDsn; kind: EnvelopeKind } | null {
  const bytes = Buffer.from(body, 'utf8');

  const header = readLine(bytes, 0);
  const headerDsn = parseObject(header.text)?.dsn;
  const dsn = typeof headerDsn === 'string' ? parseDsn(headerDsn) : null;
  if (!dsn) return null;

  let kind: EnvelopeKind = 'other';
  let events = 0;
  let dropped = 0;
  let position = header.next;
  while (position < bytes.length) {
    const itemLine = readLine(bytes, position);
    position = itemLine.next;
    // A blank line, such as the one a trailing newline leaves, is no item.
    if (itemLine.text === '') continue;

    const item = parseObject(itemLine.text);
    if (!item) return null;

    let payload: string;
    if ('length' in item) {
      const length = item.length;
      if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) return null;
      const end = position + length;
      if (end > bytes.length || (end < bytes.length && bytes[end] !== NEWLINE)) return null;
      payload = bytes.toString('utf8', position, end);
      position = end + 1;
    } else {
      const payloadLine = readLine(bytes, position);
      payload = payloadLine.text;
      position = payloadLine.next;
    }

    if (item.type === 'event') {
      if (events > 0 || dropped > 0) return null;
      events++;
      const event = parseObject(payload);
      if (!event) return null;
      const tags = event.tags;
      const tagged = typeof tags === 'object' && tags !== null && !Array.isArray(tags);
      kind = tagged && (tags as Record<string, unknown>).kind === 'report' ? 'report' : 'error';
    } else if (typeof item.type === 'string' && DROPPED_TYPES.includes(item.type)) {
      if (events > 0) return null;
      dropped++;
    } else {
      return null;
    }
  }

  return { dsn, kind };
}
