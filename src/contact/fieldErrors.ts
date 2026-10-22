import type { ContactField, FieldError } from './rules';

/** The words for a field's error, as the page shows it under the field. */
const TEXTS: Record<ContactField, Partial<Record<FieldError, string>>> = {
  email: {
    required: 'Enter your email, so I can reply.',
    invalid: 'Enter a valid email, like name@example.com.',
  },
  subject: {
    required: 'Enter a subject.',
    tooShort: 'Use at least 3 characters.',
    tooLong: 'Use 120 characters at most.',
    html: 'Remove the HTML tags.',
  },
  message: {
    required: 'Enter a message.',
    tooShort: 'Use at least 10 characters.',
    tooLong: 'Use 5,000 characters at most.',
    tooManyLinks: 'Use 3 links at most.',
    html: 'Remove the HTML tags.',
  },
};

/**
 * What a field's error says. A pair the rules never produce (an email that is
 * `tooShort`, say, as the service could in theory answer) gets a general line
 * rather than none.
 */
export function fieldErrorText(field: ContactField, error: FieldError): string {
  return TEXTS[field][error] ?? 'Check this field.';
}
