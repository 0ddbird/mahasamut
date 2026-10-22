/**
 * The alert that tells the owner Resend is failing and Brevo took over. It
 * carries nothing of the visitor or their message, only Resend's error code.
 * Node loads this file as it is, by stripping its types: no enums, no
 * namespaces, no parameter properties.
 */
import { SENDER, SENDER_ADDRESS } from './mail.ts';
import type { Transport } from './transports.ts';

const DAY = 24 * 3_600_000;
const ALERT_TIMEOUT_MS = 10_000;

/**
 * Creates the alerter. `notify` sends the alert through `transport` to `to`,
 * at most once per 24 hours; a send that fails does not count, so the next
 * fallback tries again. It never rejects, so callers need not await it.
 */
export function createAlerter(deps: { transport: Transport; to: string; now: () => number }): {
  notify(primaryCode: string): Promise<void>;
} {
  const { transport, to, now } = deps;
  let lastAlertAt: number | undefined;

  return {
    async notify(primaryCode) {
      const at = now();
      if (lastAlertAt !== undefined && at - lastAlertAt < DAY) return;
      // Taken before sending, so two fallbacks at once send one alert.
      lastAlertAt = at;
      try {
        const result = await transport.send(
          {
            from: SENDER_ADDRESS,
            to,
            replyTo: SENDER.email,
            subject: '[Mahasamut] Resend failed, Brevo took over',
            text: `Resend failed (${primaryCode}), so Brevo sent a contact message. Check the Resend dashboard and its key in the vault.`,
          },
          AbortSignal.timeout(ALERT_TIMEOUT_MS),
        );
        if (!result.ok) lastAlertAt = undefined;
      } catch {
        lastAlertAt = undefined;
      }
    },
  };
}
