import { describe, expect, it, vi } from 'vitest';
import { readConfig } from './config.ts';
import type { Mail } from './mail.ts';

const MAIL: Mail = {
  from: 'Mahasamut <hello@mahasamut.app>',
  to: 'owner@example.com',
  replyTo: 'visitor@example.org',
  subject: 'A question about tones',
  text: 'Hello, how do I practise the falling tone?',
};

describe('readConfig', () => {
  it('refuses to start in production without its secrets, naming them only', () => {
    expect(() => readConfig({ NODE_ENV: 'production' }, () => {})).toThrow(
      'Missing CONTACT_TO, RESEND_API_KEY',
    );
  });

  it('names only the missing variable, never a value', () => {
    const env = { NODE_ENV: 'production', CONTACT_TO: 'owner-secret@example.com' };

    let message = '';
    try {
      readConfig(env, () => {});
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toBe('Missing RESEND_API_KEY');
    expect(message).not.toContain('owner-secret@example.com');
  });

  it('counts an empty variable as missing in production', () => {
    const env = {
      NODE_ENV: 'production',
      CONTACT_TO: 'owner@example.com',
      RESEND_API_KEY: '',
    };

    expect(() => readConfig(env, () => {})).toThrow('Missing RESEND_API_KEY');
  });

  it('reads the variables in production, with the public origin and the port 3002', () => {
    const config = readConfig(
      {
        NODE_ENV: 'production',
        CONTACT_TO: 'owner@example.com',
        RESEND_API_KEY: 'resend-key',
      },
      () => {},
    );

    expect(config.port).toBe(3002);
    expect(config.origin).toBe('https://mahasamut.app');
    expect(config.to).toBe('owner@example.com');
    expect(config.transport.name).toBe('resend');
  });

  it('prints mails instead of sending them in development', async () => {
    const lines: string[] = [];

    const config = readConfig({}, (line) => lines.push(line));

    expect(config.to).toBe('owner@example.com');
    expect(config.transport.name).toBe('console');
    await config.transport.send(MAIL, AbortSignal.timeout(1000));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(MAIL.subject);
    expect(lines[0]).toContain(MAIL.text);
  });

  it('sends through Resend in development when its key is set', () => {
    const config = readConfig({ RESEND_API_KEY: 'resend-key' }, () => {});

    expect(config.transport.name).toBe('resend');
  });

  it('reads the port and origin', () => {
    const env = { CONTACT_PORT: '3901', CONTACT_ORIGIN: 'http://localhost:4000' };

    const config = readConfig(env, () => {});

    expect(config.port).toBe(3901);
    expect(config.origin).toBe('http://localhost:4000');
    expect(readConfig({}, () => {}).origin).toBe('http://localhost:5173');
  });

  it('reads the DSN of the site for the report tunnel, which is off without it', () => {
    const env = { SENTRY_SITE_DSN: 'https://public@o1.ingest.de.sentry.io/42' };

    expect(readConfig(env, () => {}).siteDsn).toEqual({
      host: 'o1.ingest.de.sentry.io',
      projectId: '42',
      publicKey: 'public',
    });
    expect(readConfig({}, () => {}).siteDsn).toBeNull();
    expect(readConfig({ SENTRY_SITE_DSN: '' }, () => {}).siteDsn).toBeNull();
  });

  it('does not need the DSN of the site in production', () => {
    const env = { NODE_ENV: 'production', CONTACT_TO: 'owner@example.com', RESEND_API_KEY: 'k' };

    expect(readConfig(env, () => {}).siteDsn).toBeNull();
  });

  it('turns the tunnel off, and does not stop the backend, for a DSN that is not one', () => {
    const env = { SENTRY_SITE_DSN: 'secret-looking-text' };
    const log = vi.fn();

    const config = readConfig(env, log);

    expect(config.siteDsn).toBeNull();
    // A fixed line that names the variable only, never its value.
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('SENTRY_SITE_DSN'));
    expect(log.mock.calls[0][0]).not.toContain('secret-looking-text');
  });

  it('says nothing about the tunnel when the DSN is valid or not set', () => {
    const log = vi.fn();

    readConfig({ SENTRY_SITE_DSN: 'https://public@o1.ingest.de.sentry.io/42' }, log);
    readConfig({}, log);

    expect(log).not.toHaveBeenCalled();
  });

  it('refuses a port that is not one, naming the variable only', () => {
    expect(() => readConfig({ CONTACT_PORT: 'not-a-port' }, () => {})).toThrow(
      'Invalid CONTACT_PORT',
    );
  });
});
