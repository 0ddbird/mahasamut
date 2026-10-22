import { describe, expect, it } from 'vitest';
import { checkContact } from './rules';
import type { ContactDraft } from './rules';

const VALID: ContactDraft = {
  email: 'a@b.co',
  subject: 'Hello',
  message: 'A question about tones.',
};

/** The valid draft with some fields replaced. */
const draft = (changes: Partial<ContactDraft>): ContactDraft => ({ ...VALID, ...changes });

describe('checkContact', () => {
  it('accepts a plain message', () => {
    expect(checkContact(VALID)).toEqual({});
  });

  it('requires every field, after trimming', () => {
    expect(checkContact({ email: ' ', subject: '', message: '\n' })).toEqual({
      email: 'required',
      subject: 'required',
      message: 'required',
    });
  });

  it('rejects an implausible email', () => {
    for (const email of ['a@b', 'a b@c.de', '<a@b.co>']) {
      expect(checkContact(draft({ email }))).toEqual({ email: 'invalid' });
    }
    expect(checkContact(draft({ email: `${'a'.repeat(250)}@b.co` }))).toEqual({
      email: 'invalid',
    });
  });

  it('bounds the subject', () => {
    expect(checkContact(draft({ subject: 'ab' }))).toEqual({ subject: 'tooShort' });
    expect(checkContact(draft({ subject: 'a'.repeat(121) }))).toEqual({ subject: 'tooLong' });
    expect(checkContact(draft({ subject: 'abc' }))).toEqual({});
    expect(checkContact(draft({ subject: 'a'.repeat(120) }))).toEqual({});
  });

  it('bounds the message', () => {
    expect(checkContact(draft({ message: 'a'.repeat(9) }))).toEqual({ message: 'tooShort' });
    expect(checkContact(draft({ message: 'a'.repeat(5001) }))).toEqual({ message: 'tooLong' });
    expect(checkContact(draft({ message: 'a'.repeat(10) }))).toEqual({});
    expect(checkContact(draft({ message: 'a'.repeat(5000) }))).toEqual({});
  });

  it('accepts a Thai message of exactly 10 characters', () => {
    expect(checkContact(draft({ message: 'สวัสดีครับ' }))).toEqual({});
    expect(checkContact(draft({ message: 'สวัสดีคร' }))).toEqual({ message: 'tooShort' });
  });

  it('allows three links across subject and message, not four', () => {
    const subject = 'see www.a.com';
    const message = 'Look at https://b.com and http://c.com';
    expect(checkContact(draft({ subject, message }))).toEqual({});
    expect(checkContact(draft({ subject, message: `${message} https://d.com` }))).toEqual({
      message: 'tooManyLinks',
    });
  });

  it('rejects HTML tags', () => {
    expect(checkContact(draft({ message: 'Hi <b>there</b>, a question' }))).toEqual({
      message: 'html',
    });
    expect(checkContact(draft({ subject: '<!-- x -->' }))).toEqual({ subject: 'html' });
    expect(checkContact(draft({ message: '2 < 3 and a<-b' }))).toEqual({});
  });

  it('checks length before content', () => {
    expect(checkContact(draft({ subject: '<a' }))).toEqual({ subject: 'tooShort' });
  });
});
