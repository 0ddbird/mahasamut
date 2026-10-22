import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContactPayload } from './rules';
import { sendContact } from './send';

const PAYLOAD: ContactPayload = {
  email: 'a@b.co',
  subject: 'Hello',
  message: 'A question about tones.',
  website: '',
  elapsedMs: 12_000,
};

/** Stubs fetch with one answer: a JSON body with a status. */
const answer = (body: unknown, status = 200) => {
  const fetchStub = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendContact', () => {
  it('posts the payload as JSON to /api/contact', async () => {
    const fetchStub = answer({ result: 'sent' });
    await sendContact(PAYLOAD);

    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/contact');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(PAYLOAD);
  });

  it("returns the service's reply, whatever the status", async () => {
    answer({ result: 'sent' });
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'sent' });

    answer({ result: 'invalid', fields: { email: 'invalid' } }, 400);
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'invalid', fields: { email: 'invalid' } });

    answer({ result: 'limited', scope: 'site' }, 429);
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'limited', scope: 'site' });

    answer({ result: 'failed' }, 502);
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'failed' });
  });

  it('turns a network failure, a non-JSON answer or a refusal into failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'failed' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })),
    );
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'failed' });

    answer({ result: 'refused' }, 403);
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'failed' });

    answer({ unexpected: true });
    expect(await sendContact(PAYLOAD)).toEqual({ result: 'failed' });
  });
});
