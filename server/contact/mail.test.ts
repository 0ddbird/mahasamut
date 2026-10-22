import { describe, expect, it } from 'vitest';
import { buildMail } from './mail.ts';

describe('buildMail', () => {
  it('builds the email for the owner', () => {
    const mail = buildMail(
      { email: 'a@b.co', subject: 'Hello', message: 'A message long enough.' },
      'owner@example.com',
    );
    expect(mail).toEqual({
      from: 'Mahasamut <hello@mahasamut.app>',
      to: 'owner@example.com',
      replyTo: 'a@b.co',
      subject: '[Mahasamut] Hello',
      text: 'A message long enough.\n\n— a@b.co, via mahasamut.app/contact',
    });
  });

  it('puts the subject on one line', () => {
    const mail = buildMail(
      { email: 'a@b.co', subject: 'Hi\r\nBcc: x@y.z', message: 'A message long enough.' },
      'owner@example.com',
    );
    expect(mail.subject).toBe('[Mahasamut] Hi Bcc: x@y.z');
  });
});
