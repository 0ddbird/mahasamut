import { Link } from 'react-router';
import { useLeaveLink } from './leaveGuard';
import { KOFI_LABEL, KOFI_URL } from './support';
import styles from './SiteFooter.module.scss';

/**
 * The foot of every page, quiet under it: the about page, the support page on
 * Ko-fi, and the copyright. Like the bar's links, About asks first during a
 * game; Ko-fi opens in a new tab, where the game is not lost.
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
          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer">
            {KOFI_LABEL}
          </a>
        </li>
      </ul>
      <p className={styles.copyright}>© 2026 Mahasamut</p>
    </footer>
  );
}
