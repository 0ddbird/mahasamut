/**
 * The email the owner receives for a contact message. Node loads this file as
 * it is, by stripping its types: no enums, no namespaces, no parameter
 * properties.
 */
import type { ContactDraft } from '../../src/contact/rules.ts';

/** One email, as every transport sends it. */
export interface Mail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** Who the emails come from, as a From header; the domain is verified with Resend. */
export const SENDER_ADDRESS = 'Mahasamut <hello@mahasamut.app>';

/**
 * The email for a normalized draft, sent to `to` with the visitor as reply-to.
 * Every run of whitespace in the subject, line breaks included, becomes one
 * space, so a visitor cannot add a header line to the email.
 */
export function buildMail(draft: ContactDraft, to: string): Mail {
  return {
    from: SENDER_ADDRESS,
    to,
    replyTo: draft.email,
    subject: `[Mahasamut] ${draft.subject.replace(/\s+/g, ' ')}`,
    text: `${draft.message}\n\n— ${draft.email}, via mahasamut.app/contact`,
  };
}
