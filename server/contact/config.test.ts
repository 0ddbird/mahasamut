import { describe, expect, it } from 'vitest';
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
    const env = { NODE_ENV: 'production', BREVO_API_KEY: 'brevo-secret-value' };

    let message = '';
    try {
      readConfig(env, () => {});
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toBe('Missing CONTACT_TO, RESEND_API_KEY');
    expect(message).not.toContain('brevo-secret-value');
  });

  it('counts an empty variable as missing in production', () => {
    const env = {
      NODE_ENV: 'production',
      CONTACT_TO: 'owner@example.com',
      RESEND_API_KEY: '',
      BREVO_API_KEY: 'brevo-secret-value',
    };

    expect(() => readConfig(env, () => {})).toThrow('Missing RESEND_API_KEY');
  });

  it('reads the variables in production, with the public origin and the port 3002', () => {
    const config = readConfig(
      {
        NODE_ENV: 'production',
        CONTACT_TO: 'owner@example.com',
        RESEND_API_KEY: 'resend-key',
        BREVO_API_KEY: 'brevo-key',
      },
      () => {},
    );

    expect(config.port).toBe(3002);
    expect(config.origin).toBe('https://mahasamut.app');
    expect(config.to).toBe('owner@example.com');
    expect(config.transports.primary.name).toBe('resend');
    expect(config.transports.fallback.name).toBe('brevo');
  });

  it('prints mails instead of sending them in development', async () => {
    const lines: string[] = [];

    const config = readConfig({}, (line) => lines.push(line));

    expect(config.to).toBe('owner@example.com');
    expect(config.transports.primary.name).toBe('console');
    expect(config.transports.fallback.name).toBe('console');
    await config.transports.primary.send(MAIL, AbortSignal.timeout(1000));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(MAIL.subject);
    expect(lines[0]).toContain(MAIL.text);
  });

  it('reads the port and origin', () => {
    const env = { CONTACT_PORT: '3901', CONTACT_ORIGIN: 'http://localhost:4000' };

    const config = readConfig(env, () => {});

    expect(config.port).toBe(3901);
    expect(config.origin).toBe('http://localhost:4000');
    expect(readConfig({}, () => {}).origin).toBe('http://localhost:5173');
  });

  it('refuses a port that is not one, naming the variable only', () => {
    expect(() => readConfig({ CONTACT_PORT: 'not-a-port' }, () => {})).toThrow(
      'Invalid CONTACT_PORT',
    );
  });
});
