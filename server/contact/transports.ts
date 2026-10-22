/**
 * The ways to send a Mail: Resend, or the console while developing.
 * A transport never rejects: it answers with a SendResult, and says whether a
 * failure is worth trying again. Each real one takes the `fetch` to use, so
 * tests never reach the network.
 * Node loads this file as it is, by stripping its types: no enums, no
 * namespaces, no parameter properties.
 */
import type { Mail } from './mail.ts';

/** Which transport sent, or tried to. */
export type TransportName = 'resend' | 'console';

/**
 * What a send came to. A failure carries a short code (`http-<status>`,
 * `timeout` or `network`) and whether trying again may help.
 */
export type SendResult = { ok: true } | { ok: false; transient: boolean; code: string };

/** Something that can send a Mail. `send` never rejects. */
export interface Transport {
  name: TransportName;
  /** Sends `mail`; the request is dropped, as a `timeout`, once `signal` aborts. */
  send(mail: Mail, signal: AbortSignal): Promise<SendResult>;
}

/** POSTs `body` as JSON and turns the outcome into a SendResult, without throwing. */
async function postJson(
  fetchFn: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
): Promise<SendResult> {
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
    // The answer's body is not needed: let go of the connection.
    response.body?.cancel().catch(() => {});
    if (response.ok) return { ok: true };
    const transient = response.status === 429 || response.status >= 500;
    return { ok: false, transient, code: `http-${response.status}` };
  } catch {
    return { ok: false, transient: true, code: signal.aborted ? 'timeout' : 'network' };
  }
}

/** Sends through Resend's HTTP API. */
export function resendTransport(apiKey: string, fetchFn: typeof fetch = fetch): Transport {
  return {
    name: 'resend',
    send: (mail, signal) =>
      postJson(
        fetchFn,
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${apiKey}` },
        {
          from: mail.from,
          to: [mail.to],
          reply_to: mail.replyTo,
          subject: mail.subject,
          text: mail.text,
        },
        signal,
      ),
  };
}

/** Prints the whole mail instead of sending it: for development only. */
export function consoleTransport(log: (line: string) => void): Transport {
  return {
    name: 'console',
    async send(mail) {
      log(
        [
          `From: ${mail.from}`,
          `To: ${mail.to}`,
          `Reply-To: ${mail.replyTo}`,
          `Subject: ${mail.subject}`,
          '',
          mail.text,
        ].join('\n'),
      );
      return { ok: true };
    },
  };
}
