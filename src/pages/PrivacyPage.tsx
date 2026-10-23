import { Link } from 'react-router';
import styles from './PrivacyPage.module.scss';

/**
 * Who publishes and hosts the site, then what it keeps and what it does not,
 * in the order of what a visitor meets: the browser, the counters, the rooms,
 * the contact form, the reports. Every line states a fact of the code; when a
 * feature changes what is kept, this page changes with it. Linked from the
 * footer of every page.
 */
export function PrivacyPage() {
  return (
    <main className={styles.page}>
      <h1>Privacy and legal notice</h1>
      <p>Mahasamut is free, with no account. This page says who is behind it and what it keeps.</p>

      <h2>Legal notice</h2>
      <ul>
        <li>
          <strong>Publisher.</strong> Mahasamut is made by a private individual. It is not a
          professional site, and its publisher stays anonymous, as article 6 of the French law for
          trust in the digital economy (LCEN) allows. To reach them, use the{' '}
          <Link to="/contact">contact page</Link>.
        </li>
        <li>
          <strong>Host.</strong> OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Phone: +33 9 72
          10 10 07.
        </li>
      </ul>

      <h2>Privacy</h2>
      <ul>
        <li>
          <strong>No tracking.</strong> No account, no cookies, no ads, and no tracking from one
          site to another.
        </li>
        <li>
          <strong>In your browser.</strong> Your game settings stay in <code>localStorage</code> on
          your device. Your seat in a multiplayer room is a token kept in{' '}
          <code>sessionStorage</code> (cleared when you close the tab) and sent only to the
          Mahasamut server, to bring you back to your seat.
        </li>
        <li>
          <strong>Usage statistics.</strong> Mahasamut counts, on its own server, the pages viewed,
          the solo games started and finished, the clicks on Listen, the lobby links copied and the
          clicks on the support link. These are plain counters, with no IP address and no
          identifier.
        </li>
        <li>
          <strong>Multiplayer.</strong> Your nickname and your answers are kept in the memory of the
          server only while the room exists.
        </li>
        <li>
          <strong>Contact form.</strong> Your email address and your message are sent by Resend (EU
          region) to the mailbox of the author. The site keeps no copy of your message or your
          address, and replies come from that mailbox.
        </li>
        <li>
          <strong>Error reports and question reports.</strong> They are sent to Sentry (Functional
          Software, Inc.), which stores them in Frankfurt, Germany. They go through the Mahasamut
          server, so Sentry never sees your IP address. An error report holds your browser (its
          User-Agent), the page, the error, and what happened on the page just before it. A question
          report, sent only when you report a question, holds the question, the reasons you ticked
          and your comment, if you write one. Neither holds an email address. Sentry keeps them for
          30 days.
        </li>
        <li>
          <strong>Your rights.</strong> To ask about or delete a contact message, write through the{' '}
          <Link to="/contact">contact page</Link>. You can also complain to the{' '}
          <a href="https://www.cnil.fr">CNIL</a>, the French data protection authority.
        </li>
      </ul>
    </main>
  );
}
