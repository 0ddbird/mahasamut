import { describe, expect, it } from 'vitest';
import type { Mail } from './mail.ts';
import { consoleTransport, resendTransport } from './transports.ts';

const MAIL: Mail = {
  from: 'Mahasamut <hello@mahasamut.app>',
  to: 'owner@example.com',
  replyTo: 'a@b.co',
  subject: '[Mahasamut] Hello',
  text: 'A message long enough.\n\n— a@b.co, via mahasamut.app/contact',
};

interface Call {
  url: string;
  method: string | undefined;
  headers: Record<string, string>;
  body: unknown;
}

/** A fetch that records what it was asked and answers with `status`. */
function recordingFetch(status = 200): { fetchFn: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return new Response(null, { status });
  }) as typeof fetch;
  return { fetchFn, calls };
}

const signal = () => new AbortController().signal;

describe('resendTransport', () => {
  it('sends to Resend as documented', async () => {
    const { fetchFn, calls } = recordingFetch();
    const result = await resendTransport('re_key', fetchFn).send(MAIL, signal());
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers.Authorization).toBe('Bearer re_key');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toEqual({
      from: 'Mahasamut <hello@mahasamut.app>',
      to: ['owner@example.com'],
      reply_to: 'a@b.co',
      subject: '[Mahasamut] Hello',
      text: MAIL.text,
    });
  });
});

describe('failures', () => {
  it('calls a 429 or a 503 transient and a 401 not', async () => {
    const results = [];
    for (const status of [429, 503, 401]) {
      results.push(await resendTransport('k', recordingFetch(status).fetchFn).send(MAIL, signal()));
    }
    expect(results).toEqual([
      { ok: false, transient: true, code: 'http-429' },
      { ok: false, transient: true, code: 'http-503' },
      { ok: false, transient: false, code: 'http-401' },
    ]);
  });

  it('calls a rejected fetch a transient network failure', async () => {
    const fetchFn = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const result = await resendTransport('k', fetchFn).send(MAIL, signal());
    expect(result).toEqual({ ok: false, transient: true, code: 'network' });
  });

  it('calls an aborted request a timeout', async () => {
    const fetchFn = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })) as typeof fetch;
    const result = await resendTransport('k', fetchFn).send(MAIL, AbortSignal.timeout(10));
    expect(result).toEqual({ ok: false, transient: true, code: 'timeout' });
  });
});

describe('consoleTransport', () => {
  it('prints the whole mail', async () => {
    const lines: string[] = [];
    const result = await consoleTransport((line) => lines.push(line)).send(MAIL, signal());
    expect(result).toEqual({ ok: true });
    const printed = lines.join('\n');
    for (const part of [MAIL.from, MAIL.to, MAIL.replyTo, MAIL.subject, MAIL.text]) {
      expect(printed).toContain(part);
    }
  });
});
