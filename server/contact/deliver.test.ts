import { describe, expect, it } from 'vitest';
import { deliver } from './deliver.ts';
import type { Mail } from './mail.ts';
import type { SendResult, Transport } from './transports.ts';

const MAIL: Mail = {
  from: 'Mahasamut <hello@mahasamut.app>',
  to: 'owner@example.com',
  replyTo: 'a@b.co',
  subject: '[Mahasamut] Hello',
  text: 'A message long enough.',
};

const OK: SendResult = { ok: true };
const transient = (code: string): SendResult => ({ ok: false, transient: true, code });
const permanent = (code: string): SendResult => ({ ok: false, transient: false, code });

/** A transport that answers with the scripted results, one per call. */
function scripted(results: SendResult[]): Transport & { calls: number } {
  const transport = {
    name: 'resend' as const,
    calls: 0,
    async send() {
      const result = results[transport.calls++];
      if (!result) throw new Error(`unexpected call ${transport.calls}`);
      return result;
    },
  };
  return transport;
}

function setup(transport: Transport) {
  const waits: number[] = [];
  const deps = {
    transport,
    wait: async (ms: number) => {
      waits.push(ms);
    },
    attemptMs: 1000,
  };
  return { deps, waits };
}

describe('deliver', () => {
  it('sends by the transport when it works', async () => {
    const transport = scripted([OK]);
    const { deps, waits } = setup(transport);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'resend' });
    expect(transport.calls).toBe(1);
    expect(waits).toEqual([]);
  });

  it('retries once after a second on a transient failure', async () => {
    const transport = scripted([transient('http-503'), OK]);
    const { deps, waits } = setup(transport);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'resend' });
    expect(transport.calls).toBe(2);
    expect(waits).toEqual([1000]);
  });

  it('fails at once on a permanent failure, without a retry', async () => {
    const transport = scripted([permanent('http-401')]);
    const { deps, waits } = setup(transport);
    expect(await deliver(MAIL, deps)).toEqual({ ok: false, codes: ['http-401'] });
    expect(transport.calls).toBe(1);
    expect(waits).toEqual([]);
  });

  it('fails with both codes after two transient failures', async () => {
    const transport = scripted([transient('timeout'), transient('http-503')]);
    const { deps, waits } = setup(transport);
    expect(await deliver(MAIL, deps)).toEqual({ ok: false, codes: ['timeout', 'http-503'] });
    expect(transport.calls).toBe(2);
    expect(waits).toEqual([1000]);
  });

  it('fails with both codes when the retry fails permanently', async () => {
    const transport = scripted([transient('network'), permanent('http-422')]);
    const { deps } = setup(transport);
    expect(await deliver(MAIL, deps)).toEqual({ ok: false, codes: ['network', 'http-422'] });
  });

  it('gives each attempt its own timeout', async () => {
    /** Never answers until its own signal aborts. */
    const hanging: Transport = {
      name: 'resend',
      send: (_mail, signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve(transient('timeout')));
        }),
    };
    const { deps } = setup(hanging);
    const result = await deliver(MAIL, { ...deps, attemptMs: 20 });
    expect(result).toEqual({ ok: false, codes: ['timeout', 'timeout'] });
  });
});
