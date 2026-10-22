/**
 * What a contact message must look like, shared by the page (to guide the
 * player as they type) and by the service in server/contact (to enforce it).
 * Node loads this file as it is, by stripping its types, so it imports nothing
 * and keeps to syntax that disappears with them: no enums, no namespaces.
 * Lengths are measured with `.length` once the text is trimmed.
 */

/** The three fields a player fills in. */
export type ContactField = 'email' | 'subject' | 'message';

/** What the player has typed. */
export interface ContactDraft {
  email: string;
  subject: string;
  message: string;
}

/** Why a field is refused. */
export type FieldError = 'required' | 'invalid' | 'tooShort' | 'tooLong' | 'tooManyLinks' | 'html';

/** The refused fields and why; empty when the draft is valid. */
export type ContactErrors = Partial<Record<ContactField, FieldError>>;

/** What the page sends: the draft, plus the two signals that unmask a robot. */
export interface ContactPayload extends ContactDraft {
  /** A hidden field a person leaves empty. */
  website: string;
  /** How long the form stayed open, in milliseconds. */
  elapsedMs: number;
}

/** What the service answers. */
export type ContactReply =
  | { result: 'sent' }
  | { result: 'invalid'; fields: ContactErrors }
  | { result: 'limited'; scope: 'ip' | 'site' }
  | { result: 'failed' }
  | { result: 'refused' };

/** The bounds, in characters (UTF-16 units, as `.length` counts them). */
export const CONTACT_LIMITS = {
  email: 254,
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 5000 },
  /** Links allowed across the subject and the message together. */
  links: 3,
};

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const LINK = /https?:\/\/|www\./gi;
const HTML_TAG = /<[a-z!/]/i;

/** The draft with each field trimmed. */
export function normalizeDraft(draft: ContactDraft): ContactDraft {
  return {
    email: draft.email.trim(),
    subject: draft.subject.trim(),
    message: draft.message.trim(),
  };
}

/** The error of a free-text field: its length first, then whether it holds HTML. */
function checkText(value: string, bounds: { min: number; max: number }): FieldError | undefined {
  if (value.length === 0) return 'required';
  if (value.length < bounds.min) return 'tooShort';
  if (value.length > bounds.max) return 'tooLong';
  if (HTML_TAG.test(value)) return 'html';
  return undefined;
}

/**
 * The errors of a draft, once trimmed; `{}` means it can be sent. Each field
 * reports its first error only. Links are counted over the subject and the
 * message together and reported on the message.
 */
export function checkContact(draft: ContactDraft): ContactErrors {
  const { email, subject, message } = normalizeDraft(draft);
  const errors: ContactErrors = {};

  if (email.length === 0) errors.email = 'required';
  else if (email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) errors.email = 'invalid';

  const subjectError = checkText(subject, CONTACT_LIMITS.subject);
  if (subjectError) errors.subject = subjectError;

  const messageError = checkText(message, CONTACT_LIMITS.message);
  if (messageError) errors.message = messageError;
  else if ((`${subject} ${message}`.match(LINK) ?? []).length > CONTACT_LIMITS.links) {
    errors.message = 'tooManyLinks';
  }

  return errors;
}
