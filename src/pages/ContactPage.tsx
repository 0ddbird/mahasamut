import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/Button/Button';
import { fieldErrorText } from '../contact/fieldErrors';
import { checkContact, normalizeDraft } from '../contact/rules';
import type { ContactDraft, ContactErrors, ContactField, ContactReply } from '../contact/rules';
import { sendContact } from '../contact/send';
import styles from './ContactPage.module.scss';

/** Where a message that cannot be sent can be written instead. */
const CONTACT_EMAIL = 'hello@mahasamut.app';

/** The fields in the order of the form, and what each is called. */
const FIELDS: Array<{ field: ContactField; label: string }> = [
  { field: 'email', label: 'Your email' },
  { field: 'subject', label: 'Subject' },
  { field: 'message', label: 'Message' },
];

/** What the visitor is told when the message was not sent, by answer. */
function noticeFor(reply: Exclude<ContactReply, { result: 'sent' } | { result: 'invalid' }>) {
  if (reply.result === 'limited') {
    return reply.scope === 'ip'
      ? "You've already sent a few messages. Please try again later."
      : 'Too many messages today. Please try again tomorrow.';
  }
  return `Your message couldn't be sent. Please try again later, or write to ${CONTACT_EMAIL}.`;
}

/**
 * The contact form: an email, a subject and a message, sent to the author by
 * the contact service. Mistakes are said under their field once the visitor
 * has tried to send, and follow the text from then on; the service checks the
 * same rules again. A hidden field and the time spent on the page let the
 * service tell robots from people. When the message is on its way the form is
 * replaced by a thanks; any other answer is said above the button and the
 * form keeps the text.
 */
export function ContactPage() {
  const [draft, setDraft] = useState<ContactDraft>({ email: '', subject: '', message: '' });
  const [website, setWebsite] = useState('');
  const [attempted, setAttempted] = useState(false);
  // What the service found wrong, until the visitor edits that field.
  const [serviceErrors, setServiceErrors] = useState<ContactErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [openedAt] = useState(() => performance.now());
  // Set at once on submit, before the button is disabled by the next render.
  const busy = useRef(false);
  const baseId = useId();

  const errors: ContactErrors = attempted ? { ...checkContact(draft), ...serviceErrors } : {};

  const edit = (field: ContactField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setServiceErrors(({ [field]: _edited, ...rest }) => rest);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    setAttempted(true);
    setNotice(null);

    const found = checkContact(draft);
    const first = FIELDS.find(({ field }) => found[field]);
    if (first) {
      const input = event.currentTarget.elements.namedItem(first.field);
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    busy.current = true;
    setSending(true);
    const clean = normalizeDraft(draft);
    const reply = await sendContact({
      ...clean,
      website,
      elapsedMs: Math.round(performance.now() - openedAt),
    });
    busy.current = false;
    setSending(false);

    if (reply.result === 'sent') setSentTo(clean.email);
    else if (reply.result === 'invalid') setServiceErrors(reply.fields);
    else setNotice(noticeFor(reply));
  };

  if (sentTo !== null) {
    return (
      <main className={styles.page}>
        <h1>Contact</h1>
        <p>Thanks, your message is on its way. I&apos;ll reply to {sentTo}.</p>
        <p>
          <Link to="/">Back to home</Link>
        </p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1>Contact</h1>
      <p>A question, an idea? Let&apos;s get in touch!</p>

      <form noValidate onSubmit={submit}>
        {FIELDS.map(({ field, label }) => {
          const error = errors[field];
          const inputId = `${baseId}-${field}`;
          const errorId = `${inputId}-error`;
          const shared = {
            id: inputId,
            className: styles.input,
            value: draft[field],
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              edit(field, event.target.value),
            name: field,
            'aria-invalid': error !== undefined,
            'aria-describedby': error ? errorId : undefined,
          };
          return (
            <div className={styles.field} key={field}>
              <label htmlFor={inputId}>{label}</label>
              {field === 'message' ? (
                <textarea {...shared} rows={7} />
              ) : (
                <input
                  {...shared}
                  type={field === 'email' ? 'email' : 'text'}
                  autoComplete={field === 'email' ? 'email' : undefined}
                />
              )}
              {error && (
                <p className={styles.error} id={errorId}>
                  {fieldErrorText(field, error)}
                </p>
              )}
            </div>
          );
        })}

        {/* The trap: a field no person sees or reaches, which robots fill in. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor={`${baseId}-website`}>Website</label>
          <input
            id={`${baseId}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        {notice && (
          <p className={styles.notice} role="alert">
            {notice}
          </p>
        )}
        <Button type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </form>

      <p className={styles.privacy}>
        Your email is only used to reply to you. Nothing is kept on this site.
      </p>
    </main>
  );
}
