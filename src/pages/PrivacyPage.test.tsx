import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from '../App';

const renderPrivacy = () =>
  render(
    <MemoryRouter initialEntries={['/privacy']}>
      <App />
    </MemoryRouter>,
  );

const page = () => within(screen.getByRole('main'));

describe('PrivacyPage', () => {
  it('is served at /privacy, under the bar', () => {
    renderPrivacy();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy and legal notice' }),
    ).toBeDefined();
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('has two parts: the legal notice and the privacy', () => {
    renderPrivacy();
    const parts = page()
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(parts).toEqual(['Legal notice', 'Privacy']);
  });

  it('names the publisher as a private individual, anonymous under the LCEN, reached by the contact page', () => {
    renderPrivacy();
    expect(page().getByText(/private individual/)).toBeDefined();
    expect(page().getByText(/article 6/)).toBeDefined();
    expect(page().getByText(/LCEN/)).toBeDefined();
    const contact = page().getAllByRole('link', { name: 'contact page' });
    expect(contact.length).toBeGreaterThan(0);
    for (const link of contact) expect(link.getAttribute('href')).toBe('/contact');
  });

  it('names the host with its address and phone number', () => {
    renderPrivacy();
    const host = page().getByText(/OVH SAS/);
    expect(host.textContent).toContain('2 rue Kellermann, 59100 Roubaix, France');
    expect(host.textContent).toContain('+33 9 72 10 10 07');
  });

  it('says there is no account, no cookies, no ads and no cross-site tracking', () => {
    renderPrivacy();
    expect(page().getByText(/No account, no cookies, no ads/)).toBeDefined();
  });

  it('says what stays in the browser, and what is counted on the server', () => {
    renderPrivacy();
    const browser = page()
      .getByRole('heading', { level: 3, name: 'In your browser' })
      .closest('section') as HTMLElement;
    expect(browser.textContent).toContain('stay in localStorage on your device');
    // The seat is a token the server issued, sent back to it to resume.
    expect(browser.textContent).toContain('a token kept in sessionStorage');
    expect(browser.textContent).toContain('cleared when you close the tab');
    expect(browser.textContent).toContain('sent only to the Mahasamut server');
    expect(browser.textContent).not.toContain('leaves your device');
    expect(page().getByText(/counts/)).toBeDefined();
    expect(page().getByText(/nickname/)).toBeDefined();
  });

  it('says the contact form goes through Resend, in the EU, and is not kept', () => {
    renderPrivacy();
    const contact = page().getByText(/Resend/);
    expect(contact.textContent).toContain('EU');
    expect(contact.textContent).toContain('keeps no copy of your message or your address');
  });

  it('says reports go to Sentry in Frankfurt through the server, without the IP address, for 30 days', () => {
    renderPrivacy();
    const reports = page().getByText(/Sentry/);
    expect(reports.textContent).toContain('Functional Software, Inc.');
    expect(reports.textContent).toContain('Frankfurt');
    expect(reports.textContent).toContain('through the Mahasamut server');
    expect(reports.textContent).toContain('never sees your IP address');
    expect(reports.textContent).toContain('what happened on the page just before it');
    expect(reports.textContent).toContain('30 days');
  });

  it('gives the rights over a contact message, and the CNIL for a complaint', () => {
    renderPrivacy();
    expect(page().getByText(/delete a contact message/)).toBeDefined();
    expect(page().getByRole('link', { name: 'CNIL' }).getAttribute('href')).toBe(
      'https://www.cnil.fr',
    );
  });
});
