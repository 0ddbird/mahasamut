import { describe, expect, it } from 'vitest';
import { createAlerter } from './alert.ts';
import type { Mail } from './mail.ts';
import type { SendResult, Transport } from './transports.ts';

const HOUR = 3_600_000;

/** A transport that records every mail and answers with `result`. */
function recording(result: SendResult = { ok: true }): Transport & { sent: Mail[] } {
  const transport = {
    name: 'brevo' as const,
    sent: [] as Mail[],
    async send(mail: Mail) {
      transport.sent.push(mail);
      return result;
    },
  };
  return transport;
}

describe('createAlerter', () => {
  it('alerts once, then not again within a day', async () => {
    const transport = recording();
    let now = 1_000_000;
    const alerter = createAlerter({ transport, to: 'owner@example.com', now: () => now });

    await alerter.notify('http-503');
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].to).toBe('owner@example.com');
    expect(transport.sent[0].subject).toBe('[Mahasamut] Resend failed, Brevo took over');
    expect(transport.sent[0].text).toBe(
      'Resend failed (http-503), so Brevo sent a contact message. Check the Resend dashboard and its key in the vault.',
    );

    now += 23 * HOUR;
    await alerter.notify('http-503');
    expect(transport.sent).toHaveLength(1);

    now += HOUR + 1;
    await alerter.notify('http-503');
    expect(transport.sent).toHaveLength(2);
  });

  it('never puts the message or the visitor in the alert', async () => {
    const transport = recording();
    const alerter = createAlerter({ transport, to: 'owner@example.com', now: () => 0 });
    // The alerter only receives the code, so nothing else can reach the mail;
    // check it anyway against what a visitor would have typed.
    await alerter.notify('timeout');
    const [alert] = transport.sent;
    for (const secret of ['visitor@example.org', 'My private subject', 'My private message']) {
      expect(alert.subject).not.toContain(secret);
      expect(alert.text).not.toContain(secret);
    }
  });

  it('swallows a failed alert', async () => {
    const rejecting: Transport = {
      name: 'brevo',
      send: async () => {
        throw new Error('boom');
      },
    };
    const failing = recording({ ok: false, transient: false, code: 'http-401' });
    await expect(
      createAlerter({ transport: rejecting, to: 'o@e.co', now: () => 0 }).notify('timeout'),
    ).resolves.toBeUndefined();
    await expect(
      createAlerter({ transport: failing, to: 'o@e.co', now: () => 0 }).notify('timeout'),
    ).resolves.toBeUndefined();
  });
});
