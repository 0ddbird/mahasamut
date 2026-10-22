import { describe, expect, it } from 'vitest';
import { deliver } from './deliver.ts';
import type { Mail } from './mail.ts';
import type { SendResult, Transport, TransportName } from './transports.ts';

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
function scripted(name: TransportName, results: SendResult[]): Transport & { calls: number } {
  const transport = {
    name,
    calls: 0,
    async send() {
      const result = results[transport.calls++];
      if (!result) throw new Error(`unexpected call ${transport.calls} to ${name}`);
      return result;
    },
  };
  return transport;
}

function setup(primary: Transport, fallback: Transport) {
  const waits: number[] = [];
  const deps = {
    primary,
    fallback,
    wait: async (ms: number) => {
      waits.push(ms);
    },
    attemptMs: 1000,
  };
  return { deps, waits };
}

describe('deliver', () => {
  it('sends by Resend when it works', async () => {
    const primary = scripted('resend', [OK]);
    const fallback = scripted('brevo', []);
    const { deps, waits } = setup(primary, fallback);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'resend' });
    expect(fallback.calls).toBe(0);
    expect(waits).toEqual([]);
  });

  it('retries Resend once after a second on a transient failure', async () => {
    const primary = scripted('resend', [transient('http-503'), OK]);
    const fallback = scripted('brevo', []);
    const { deps, waits } = setup(primary, fallback);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'resend' });
    expect(primary.calls).toBe(2);
    expect(waits).toEqual([1000]);
    expect(fallback.calls).toBe(0);
  });

  it('goes straight to Brevo on a permanent Resend failure', async () => {
    const primary = scripted('resend', [permanent('http-401')]);
    const fallback = scripted('brevo', [OK]);
    const { deps, waits } = setup(primary, fallback);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'brevo', primaryCode: 'http-401' });
    expect(primary.calls).toBe(1);
    expect(waits).toEqual([]);
  });

  it("falls back to Brevo after two transient failures, with Resend's code", async () => {
    const primary = scripted('resend', [transient('timeout'), transient('http-503')]);
    const fallback = scripted('brevo', [OK]);
    const { deps, waits } = setup(primary, fallback);
    expect(await deliver(MAIL, deps)).toEqual({ ok: true, via: 'brevo', primaryCode: 'http-503' });
    expect(primary.calls).toBe(2);
    expect(waits).toEqual([1000]);
  });

  it('fails with both codes when Brevo fails too', async () => {
    const primary = scripted('resend', [permanent('http-401')]);
    const fallback = scripted('brevo', [transient('network')]);
    const { deps } = setup(primary, fallback);
    expect(await deliver(MAIL, deps)).toEqual({ ok: false, codes: ['http-401', 'network'] });
  });

  it('gives each attempt its own timeout', async () => {
    /** Never answers until its own signal aborts. */
    const hanging = (name: TransportName): Transport => ({
      name,
      send: (_mail, signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve(transient('timeout')));
        }),
    });
    const { deps } = setup(hanging('resend'), hanging('brevo'));
    const result = await deliver(MAIL, { ...deps, attemptMs: 20 });
    expect(result).toEqual({ ok: false, codes: ['timeout', 'timeout'] });
  });
});
