import { describe, expect, it } from 'vitest';
import { parseDsn, readEnvelope } from './envelope.ts';

const DSN = 'https://public@o1.ingest.de.sentry.io/42';
const PARSED = { host: 'o1.ingest.de.sentry.io', projectId: '42', publicKey: 'public' };

/** An envelope as the SDK writes it: the header, then each item as a header line and a payload. */
function envelope(items: Array<[Record<string, unknown>, string]>, dsn = DSN): string {
  const header = JSON.stringify({ event_id: 'a'.repeat(32), sent_at: '2026-10-23T10:00:00Z', dsn });
  return [
    header,
    ...items.flatMap(([itemHeader, payload]) => [JSON.stringify(itemHeader), payload]),
  ].join('\n');
}

const event = (kind: string | undefined) =>
  JSON.stringify({ message: 'oops', ...(kind && { tags: { kind } }) });

describe('parseDsn', () => {
  it('reads the host, the project and the public key', () => {
    expect(parseDsn(DSN)).toEqual(PARSED);
  });

  it('refuses text that is not a DSN', () => {
    expect(parseDsn('not a dsn')).toBeNull();
    expect(parseDsn('')).toBeNull();
    expect(parseDsn('https://o1.ingest.de.sentry.io/42')).toBeNull();
    expect(parseDsn('https://public@o1.ingest.de.sentry.io/')).toBeNull();
    expect(parseDsn('https://public@o1.ingest.de.sentry.io/not-a-number')).toBeNull();
    expect(parseDsn('http://public@o1.ingest.de.sentry.io/42')).toBeNull();
  });
});

describe('readEnvelope', () => {
  it('reads a report as the site builds it', () => {
    // The three lines of `reportEnvelope` in src/report/report.ts, which the server cannot import.
    const body = [
      JSON.stringify({ event_id: 'b'.repeat(32), sent_at: '2026-10-23T10:00:00.000Z', dsn: DSN }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({
        event_id: 'b'.repeat(32),
        message: 'Report: Find the tone · น้ำ',
        fingerprint: ['report', 'syllable', 'น้ำ'],
        tags: { kind: 'report', game: 'syllable', 'reason.expected': 'yes' },
      }),
    ].join('\n');

    expect(readEnvelope(body)).toEqual({ dsn: PARSED, kind: 'report' });
  });

  it('reads an error as the SDK writes it', () => {
    expect(readEnvelope(envelope([[{ type: 'event' }, event('error')]]))).toEqual({
      dsn: PARSED,
      kind: 'error',
    });
  });

  it('counts an event without a kind as an error', () => {
    expect(readEnvelope(envelope([[{ type: 'event' }, event(undefined)]]))?.kind).toBe('error');
  });

  it('is not a report unless an event says so', () => {
    const body = envelope([
      [{ type: 'attachment' }, '{"tags":{"kind":"report"}}'],
      [{ type: 'event' }, event('error')],
    ]);

    expect(readEnvelope(body)?.kind).toBe('error');
  });

  it('says other for an envelope without an event', () => {
    const session = envelope([[{ type: 'session' }, '{"sid":"1","status":"ok"}']]);
    const clientReport = envelope([[{ type: 'client_report' }, '{"discarded_events":[]}']]);

    expect(readEnvelope(session)).toEqual({ dsn: PARSED, kind: 'other' });
    expect(readEnvelope(clientReport)).toEqual({ dsn: PARSED, kind: 'other' });
    expect(readEnvelope(envelope([]))).toEqual({ dsn: PARSED, kind: 'other' });
  });

  it('follows the length of an item, whose payload may hold newlines', () => {
    // The attachment looks like an event, but its length says it is one line of an attachment.
    const attachment = `x\n{"type":"event"}\n{"tags":{"kind":"report"}}`;
    const body = envelope([
      [{ type: 'attachment', length: Buffer.byteLength(attachment) }, attachment],
      [{ type: 'event', length: Buffer.byteLength(event('error')) }, event('error')],
    ]);

    expect(readEnvelope(body)?.kind).toBe('error');
  });

  it('counts the length in bytes, not in characters', () => {
    const text = 'ทดสอบ';
    const body = envelope([
      [{ type: 'attachment', length: Buffer.byteLength(text) }, text],
      [{ type: 'event' }, event('report')],
    ]);

    expect(readEnvelope(body)?.kind).toBe('report');
  });

  it('accepts a newline at the end', () => {
    expect(readEnvelope(`${envelope([[{ type: 'event' }, event('report')]])}\n`)?.kind).toBe(
      'report',
    );
  });

  it('refuses what it cannot read', () => {
    expect(readEnvelope('')).toBeNull();
    expect(readEnvelope('{broken')).toBeNull();
    expect(readEnvelope('[]')).toBeNull();
    expect(readEnvelope('{"event_id":"1"}')).toBeNull();
    expect(readEnvelope('{"dsn":"not a dsn"}')).toBeNull();
    expect(readEnvelope('{"dsn":42}')).toBeNull();
    expect(readEnvelope(envelope([[{ type: 'event' }, '{broken']]))).toBeNull();
    expect(readEnvelope(envelope([[{ type: 'event' }, '[1]']]))).toBeNull();
    expect(readEnvelope(`${envelope([])}\n{broken\n{}`)).toBeNull();
    expect(readEnvelope(`${envelope([])}\n{"type":"event"}`)).toBeNull();
  });

  it('refuses a length that does not fit', () => {
    expect(readEnvelope(envelope([[{ type: 'event', length: 9999 }, event('error')]]))).toBeNull();
    expect(readEnvelope(envelope([[{ type: 'event', length: -1 }, event('error')]]))).toBeNull();
    expect(readEnvelope(envelope([[{ type: 'event', length: '5' }, event('error')]]))).toBeNull();
    expect(readEnvelope(envelope([[{ type: 'event', length: 3 }, event('error')]]))).toBeNull();
  });

  it('refuses several events, which would get around the budgets', () => {
    const body = envelope([
      [{ type: 'event' }, event('error')],
      [{ type: 'event' }, event('error')],
    ]);

    expect(readEnvelope(body)).toBeNull();
  });
});
