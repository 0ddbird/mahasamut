/**
 * The configuration of the contact service, read from the environment. In
 * production every secret must be there, or the service refuses to start;
 * anywhere else, missing keys mean mails are printed instead of sent.
 * Node loads this file as it is, by stripping its types: no enums, no
 * namespaces, no parameter properties.
 */
import { brevoTransport, consoleTransport, resendTransport } from './transports.ts';
import type { Transport } from './transports.ts';

const DEFAULT_PORT = 3002;
const PRODUCTION_ORIGIN = 'https://mahasamut.app';
const DEVELOPMENT_ORIGIN = 'http://localhost:5173';
const DEVELOPMENT_OWNER = 'owner@example.com';

/** What the service runs with. */
export interface Config {
  port: number;
  /** The only origin a request may come from. */
  origin: string;
  /** Where the messages go. */
  to: string;
  /** Resend first, Brevo when Resend fails (both print mails in development). */
  transports: { primary: Transport; fallback: Transport };
}

/**
 * Reads the configuration from `env`. With `NODE_ENV=production` a missing
 * `CONTACT_TO`, `RESEND_API_KEY` or `BREVO_API_KEY` throws an error that names
 * the missing variables and never a value. Elsewhere, when a key is missing,
 * both transports print the mail they are given to `log`, so that real keys
 * are never needed, and the console transport never runs in production.
 */
export function readConfig(env: NodeJS.ProcessEnv, log: (line: string) => void): Config {
  const production = env.NODE_ENV === 'production';
  const { CONTACT_TO: to, RESEND_API_KEY: resendKey, BREVO_API_KEY: brevoKey } = env;

  if (production) {
    const missing = Object.entries({
      CONTACT_TO: to,
      RESEND_API_KEY: resendKey,
      BREVO_API_KEY: brevoKey,
    })
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length > 0) throw new Error(`Missing ${missing.join(', ')}`);
  }

  const port = env.CONTACT_PORT ? Number(env.CONTACT_PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid CONTACT_PORT');

  return {
    port,
    origin: env.CONTACT_ORIGIN || (production ? PRODUCTION_ORIGIN : DEVELOPMENT_ORIGIN),
    to: to || DEVELOPMENT_OWNER,
    transports:
      resendKey && brevoKey
        ? { primary: resendTransport(resendKey), fallback: brevoTransport(brevoKey) }
        : { primary: consoleTransport(log), fallback: consoleTransport(log) },
  };
}
