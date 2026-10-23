import { Link } from 'react-router';
import { trackEvent } from './analytics';
import { useLeaveLink } from './leaveGuard';
import { KOFI_LABEL, KOFI_URL } from './support';
import styles from './SiteFooter.module.scss';

/**
 * The foot of every page, quiet under it, on one line: the about page, the
 * contact page, the privacy page, the support page on Ko-fi, and the copyright. Like the bar's
 * links, About, Contact and Privacy ask first during a game; Ko-fi opens in a
 * new tab, where the game is not lost.
 */
export function SiteFooter() {
  const leaveLink = useLeaveLink();
  return (
    <footer className={styles.footer}>
      <ul className={styles.links}>
        <li>
          <Link to="/about" onClick={leaveLink('/about')}>
            About
          </Link>
        </li>
        <li>
          <Link to="/contact" onClick={leaveLink('/contact')}>
            Contact
          </Link>
        </li>
        <li>
          <Link to="/privacy" onClick={leaveLink('/privacy')}>
            Privacy
          </Link>
        </li>
        <li>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ type: 'support_click' })}
          >
            {KOFI_LABEL}
          </a>
        </li>
      </ul>
      <p className={styles.copyright}>© 2026 Mahasamut</p>
    </footer>
  );
}
