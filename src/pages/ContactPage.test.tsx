import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { ContactReply } from '../contact/rules';

const renderContact = () =>
  render(
    <MemoryRouter initialEntries={['/contact']}>
      <App />
    </MemoryRouter>,
  );

/** Stubs fetch with the given answers, one per call (the last one repeats). */
const answers = (...replies: Array<{ body: ContactReply; status: number }>) => {
  let call = 0;
  const fetchStub = vi.fn(async () => {
    const { body, status } = replies[Math.min(call++, replies.length - 1)];
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
};

const SENT = { body: { result: 'sent' } as ContactReply, status: 200 };

/** The JSON body of the n-th request. */
const bodyOf = (fetchStub: ReturnType<typeof answers>, n = 0) =>
  JSON.parse((fetchStub.mock.calls[n] as unknown as [string, RequestInit])[1].body as string);

const fill = async (email = ' me@example.com ', subject = ' Hello ', message = ' A question. ') => {
  await userEvent.type(screen.getByLabelText('Your email'), email);
  await userEvent.type(screen.getByLabelText('Subject'), subject);
  await userEvent.type(screen.getByLabelText('Message'), message);
};

const send = () => userEvent.click(screen.getByRole('button', { name: 'Send' }));

const page = () => within(screen.getByRole('main'));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContactPage', () => {
  it('is served at /contact, under the bar, with its introduction and privacy line', () => {
    renderContact();
    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeDefined();
    expect(screen.getByRole('banner')).toBeDefined();
    expect(page().getByText("A question, an idea? Let's get in touch!")).toBeDefined();
    expect(
      page().getByText('Your email is only used to reply to you. Nothing is kept on this site.'),
    ).toBeDefined();
    expect(page().getByLabelText('Your email').getAttribute('type')).toBe('email');
    expect(page().getByLabelText('Your email').getAttribute('autocomplete')).toBe('email');
    expect(page().getByLabelText('Message').tagName).toBe('TEXTAREA');
  });

  it('says what is missing without sending', async () => {
    const fetchStub = answers(SENT);
    renderContact();
    await send();

    expect(page().getByText('Enter your email, so I can reply.')).toBeDefined();
    expect(page().getByText('Enter a subject.')).toBeDefined();
    expect(page().getByText('Enter a message.')).toBeDefined();
    expect(fetchStub).not.toHaveBeenCalled();
    expect(page().getByLabelText('Your email').getAttribute('aria-invalid')).toBe('true');
  });

  it('links each error to its field and follows the text as it changes', async () => {
    renderContact();
    await send();
    const email = page().getByLabelText('Your email');
    const errorId = email.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(errorId)?.textContent).toBe('Enter your email, so I can reply.');

    await userEvent.type(email, 'nope');
    expect(document.getElementById(errorId)?.textContent).toBe(
      'Enter a valid email, like name@example.com.',
    );

    await userEvent.type(email, '@example.com');
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(email.getAttribute('aria-describedby')).toBeNull();
  });

  it('shows no error before the first attempt', async () => {
    renderContact();
    await userEvent.type(page().getByLabelText('Your email'), 'nope');
    expect(page().queryByText('Enter a valid email, like name@example.com.')).toBeNull();
    expect(page().getByLabelText('Your email').getAttribute('aria-invalid')).toBe('false');
  });

  it('sends the trimmed fields with the trap and the time spent', async () => {
    const fetchStub = answers(SENT);
    renderContact();
    await fill();
    await send();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url] = fetchStub.mock.calls[0] as unknown as [string];
    expect(url).toBe('/api/contact');
    const body = bodyOf(fetchStub);
    expect(body).toMatchObject({
      email: 'me@example.com',
      subject: 'Hello',
      message: 'A question.',
      website: '',
    });
    expect(typeof body.elapsedMs).toBe('number');
  });

  it('thanks the visitor and names the address it will reply to', async () => {
    answers(SENT);
    renderContact();
    await fill();
    await send();

    expect(
      await page().findByText("Thanks, your message is on its way. I'll reply to me@example.com."),
    ).toBeDefined();
    expect(page().getByRole('link', { name: 'Back to home' }).getAttribute('href')).toBe('/');
    expect(page().queryByRole('button', { name: 'Send' })).toBeNull();
    expect(page().queryByLabelText('Message')).toBeNull();
  });

  it.each([
    ['ip', "You've already sent a few messages. Please try again later."],
    ['site', 'Too many messages today. Please try again tomorrow.'],
  ] as const)('says when too many messages were sent (%s)', async (scope, text) => {
    answers({ body: { result: 'limited', scope }, status: 429 });
    renderContact();
    await fill();
    await send();

    expect((await page().findByRole('alert')).textContent).toBe(text);
    expect((page().getByLabelText('Message') as HTMLTextAreaElement).value).toBe(' A question. ');
  });

  it('keeps the text after a failure and sends again on retry', async () => {
    const fetchStub = answers({ body: { result: 'failed' }, status: 502 }, SENT);
    renderContact();
    await fill();
    await send();

    const alert = await page().findByRole('alert');
    expect(alert.textContent).toBe(
      "Your message couldn't be sent. Please try again later, or write to hello@mahasamut.app.",
    );
    // An email field drops the spaces around its value by itself.
    expect((page().getByLabelText('Your email') as HTMLInputElement).value).toBe('me@example.com');
    expect((page().getByLabelText('Subject') as HTMLInputElement).value).toBe(' Hello ');
    expect((page().getByLabelText('Message') as HTMLTextAreaElement).value).toBe(' A question. ');

    await send();
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(await page().findByText(/Thanks, your message is on its way/)).toBeDefined();
    expect(page().queryByRole('alert')).toBeNull();
  });

  it('sends once on a double click', async () => {
    let resolve: (response: Response) => void = () => {};
    const fetchStub = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal('fetch', fetchStub);
    renderContact();
    await fill();

    await userEvent.dblClick(screen.getByRole('button', { name: 'Send' }));
    const sending = page().getByRole('button', { name: 'Sending…' }) as HTMLButtonElement;
    expect(sending.disabled).toBe(true);
    expect(fetchStub).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve(new Response(JSON.stringify({ result: 'sent' }), { status: 200 }));
    });
    expect(await page().findByText(/Thanks, your message is on its way/)).toBeDefined();
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('shows a field error the service found', async () => {
    answers({ body: { result: 'invalid', fields: { subject: 'html' } }, status: 400 });
    renderContact();
    await fill();
    await send();

    expect(await page().findByText('Remove the HTML tags.')).toBeDefined();
    expect(page().getByLabelText('Subject').getAttribute('aria-invalid')).toBe('true');
    expect(page().queryByRole('alert')).toBeNull();
  });

  it('keeps the trap out of reach', () => {
    renderContact();
    const trap = screen.getByLabelText('Website');
    expect(trap.getAttribute('name')).toBe('website');
    expect(trap.getAttribute('tabindex')).toBe('-1');
    expect(trap.getAttribute('autocomplete')).toBe('off');
    // Password managers that ignore autocomplete="off" honour these.
    expect(trap.hasAttribute('data-1p-ignore')).toBe(true);
    expect(trap.getAttribute('data-lpignore')).toBe('true');
    expect(trap.hasAttribute('data-bwignore')).toBe(true);
    expect(trap.getAttribute('data-form-type')).toBe('other');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('does not show hello@mahasamut.app before a failure', () => {
    renderContact();
    expect(screen.queryByText(/hello@mahasamut\.app/)).toBeNull();
  });
});
