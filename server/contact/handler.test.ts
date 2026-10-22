import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContactHandler } from './handler.ts';
import type { ContactRequest } from './handler.ts';
import type { DeliverResult } from './deliver.ts';
import { createLimits } from './limits.ts';
import type { Mail } from './mail.ts';

const ORIGIN = 'https://mahasamut.app';
const OWNER = 'owner@example.com';
const IP = '203.0.113.7';
const EMAIL = 'visitor@example.org';
const SUBJECT = 'A question about tones';
const MESSAGE = 'Hello, how do I practise the falling tone?';

const valid = {
  email: ` ${EMAIL} `,
  subject: SUBJECT,
  message: MESSAGE,
  website: '',
  elapsedMs: 8000,
};

function request(overrides: Partial<ContactRequest> = {}, payload: object = valid): ContactRequest {
  return {
    method: 'POST',
    contentType: 'application/json',
    origin: ORIGIN,
    ip: IP,
    body: JSON.stringify(payload),
    ...overrides,
  };
}

describe('createContactHandler', () => {
  let now = 0;
  let sent: Mail[] = [];
  let send = vi.fn<(mail: Mail) => Promise<DeliverResult>>();
  let log: string[] = [];
  let handle = createContactHandler({
    origin: ORIGIN,
    to: OWNER,
    limits: createLimits(() => now),
    send,
    log: (line) => log.push(line),
  });

  beforeEach(() => {
    now = 1_000_000;
    sent = [];
    log = [];
    send = vi.fn(async (mail: Mail): Promise<DeliverResult> => {
      sent.push(mail);
      return { ok: true, via: 'resend' };
    });
    handle = createContactHandler({
      origin: ORIGIN,
      to: OWNER,
      limits: createLimits(() => now),
      send,
      log: (line) => log.push(line),
    });
  });

  const refusals: [string, Partial<ContactRequest>, number][] = [
    ['a wrong method', { method: 'GET' }, 405],
    ['a wrong content type', { contentType: 'text/plain' }, 415],
    ['a missing content type', { contentType: undefined }, 415],
    ['a wrong origin', { origin: 'https://evil.example' }, 403],
    ['a missing origin', { origin: undefined }, 403],
    ['a body that is not JSON', { body: '{nope' }, 400],
    ['a body that is not an object', { body: '"hello"' }, 400],
    ['a null body', { body: 'null' }, 400],
  ];

  for (const [name, overrides, status] of refusals) {
    it(`refuses ${name} with ${status}`, async () => {
      expect(await handle(request(overrides))).toEqual({ status, reply: { result: 'refused' } });
      expect(send).not.toHaveBeenCalled();
      expect(log).toEqual([]);
    });
  }

  it('accepts a content type with a charset', async () => {
    const response = await handle(request({ contentType: 'application/json; charset=utf-8' }));
    expect(response).toEqual({ status: 200, reply: { result: 'sent' } });
  });

  const badFields: [string, object][] = [
    ['a missing email', { ...valid, email: undefined }],
    ['an email that is not a string', { ...valid, email: 42 }],
    ['a subject that is not a string', { ...valid, subject: null }],
    ['a message that is not a string', { ...valid, message: ['a'] }],
    ['a website that is not a string', { ...valid, website: false }],
    ['a missing elapsedMs', { ...valid, elapsedMs: undefined }],
    ['an elapsedMs that is a string', { ...valid, elapsedMs: '8000' }],
    ['an elapsedMs that is not finite', { ...valid, elapsedMs: null }],
  ];

  for (const [name, payload] of badFields) {
    it(`refuses ${name} with 400`, async () => {
      expect(await handle(request({}, payload))).toEqual({
        status: 400,
        reply: { result: 'refused' },
      });
      expect(send).not.toHaveBeenCalled();
      expect(log).toEqual([]);
    });
  }

  /** The results of `count` valid messages sent one after the other. */
  async function sendsOf(count: number): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < count; i++) results.push((await handle(request())).reply.result);
    return results;
  }

  it('pretends to send a honeypot message, sending nothing', async () => {
    const response = await handle(request({}, { ...valid, website: 'http://spam.example' }));
    expect(response).toEqual({ status: 200, reply: { result: 'sent' } });
    expect(send).not.toHaveBeenCalled();
    expect(log).toEqual(['contact: dropped (honeypot)']);
    expect(await sendsOf(3)).toEqual(['sent', 'sent', 'limited']);
  });

  it('pretends to send a message that was too fast, sending nothing', async () => {
    const response = await handle(request({}, { ...valid, elapsedMs: 2999 }));
    expect(response).toEqual({ status: 200, reply: { result: 'sent' } });
    expect(send).not.toHaveBeenCalled();
    expect(log).toEqual(['contact: dropped (too fast)']);
    expect(await sendsOf(3)).toEqual(['sent', 'sent', 'limited']);
  });

  it('accepts a message at exactly three seconds', async () => {
    await handle(request({}, { ...valid, elapsedMs: 3000 }));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends a valid message to the owner', async () => {
    const response = await handle(request());
    expect(response).toEqual({ status: 200, reply: { result: 'sent' } });
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0]).toMatchObject({ to: OWNER, replyTo: EMAIL, subject: `[Mahasamut] ${SUBJECT}` });
    expect(sent[0].text).toContain(MESSAGE);
    expect(log).toEqual(['contact: sent via resend']);
  });

  it('logs the transport that sent, nothing more', async () => {
    send.mockResolvedValueOnce({ ok: true, via: 'console' });
    await handle(request());
    expect(log).toEqual(['contact: sent via console']);
  });

  it('answers limited for the third message of the hour', async () => {
    await handle(request());
    await handle(request());
    log = [];
    expect(await handle(request())).toEqual({
      status: 429,
      reply: { result: 'limited', scope: 'ip' },
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(log).toEqual(['contact: limited (ip)']);
  });

  it('answers limited for the whole site once its day is full', async () => {
    for (let i = 0; i < 30; i++) await handle(request({ ip: `198.51.100.${i}` }));
    log = [];
    expect(await handle(request({ ip: '192.0.2.1' }))).toEqual({
      status: 429,
      reply: { result: 'limited', scope: 'site' },
    });
    expect(log).toEqual(['contact: limited (site)']);
  });

  it('limits an IPv6 visitor by its /64', async () => {
    await handle(request({ ip: '2001:db8::1' }));
    await handle(request({ ip: '2001:db8::2' }));
    const response = await handle(request({ ip: '2001:db8::3' }));
    expect(response.reply).toEqual({ result: 'limited', scope: 'ip' });
  });

  it('three parallel sends from one IP send two', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    send.mockImplementation(async () => {
      await gate;
      return { ok: true, via: 'resend' };
    });
    const pending = [handle(request()), handle(request()), handle(request())];
    // All three have been started before any send resolves.
    release();
    const results = (await Promise.all(pending)).map((response) => response.reply.result);
    expect(results.filter((result) => result === 'sent')).toHaveLength(2);
    expect(results.filter((result) => result === 'limited')).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not count a refused or failed message', async () => {
    const invalid = await handle(request({}, { ...valid, subject: '' }));
    expect(invalid).toEqual({
      status: 400,
      reply: { result: 'invalid', fields: { subject: 'required' } },
    });
    expect(log).toEqual(['contact: invalid (subject)']);

    send.mockResolvedValueOnce({ ok: false, codes: ['http_500', 'timeout'] });
    const failed = await handle(request());
    expect(failed).toEqual({ status: 502, reply: { result: 'failed' } });
    expect(log).toEqual(['contact: invalid (subject)', 'contact: failed (http_500, timeout)']);

    expect(await sendsOf(3)).toEqual(['sent', 'sent', 'limited']);
  });

  it('lists every invalid field in the log', async () => {
    await handle(request({}, { ...valid, email: 'nope', message: 'short' }));
    expect(log).toEqual(['contact: invalid (email,message)']);
  });

  it('never logs the content, the addresses or the IP', async () => {
    await handle(request());
    await handle(request({}, { ...valid, website: 'x' }));
    await handle(request({}, { ...valid, elapsedMs: 1 }));
    await handle(request({}, { ...valid, subject: '' }));
    send.mockResolvedValueOnce({ ok: false, codes: ['a', 'b'] });
    await handle(request());
    await handle(request());
    await handle(request());
    expect(log).toHaveLength(7);
    const text = log.join('\n');
    for (const secret of [EMAIL, SUBJECT, MESSAGE, OWNER, IP]) {
      expect(text).not.toContain(secret);
    }
  });
});
