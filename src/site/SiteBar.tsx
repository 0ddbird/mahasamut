import { Menu, X } from 'lucide-react';
import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Logo } from '../components/Logo/Logo';
import { GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import styles from './SiteBar.module.scss';

/**
 * The bar at the top of every page but the home page: the logo, which always
 * goes home, then a link to each game, the one being played marked. On a
 * narrow screen the games fold into a menu that drops down under the bar.
 */
export function SiteBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const listId = useId();

  // Another page closes the menu. Done while rendering, when the path
  // changes, rather than in an effect that would show it open once more.
  const { pathname } = useLocation();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  const close = () => setMenuOpen(false);

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };

  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.home}>
        <Logo size="small" />
      </Link>
      <nav aria-label="Games" onKeyDown={closeOnEscape}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Games menu"
          aria-expanded={menuOpen}
          aria-controls={listId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <ul id={listId} className={styles.links} data-open={menuOpen || undefined}>
          {GAME_IDS.map((game) => (
            <li key={game}>
              <NavLink to={GAME_PATHS[game]} className={styles.link} onClick={close}>
                {GAME_NAMES[game]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {menuOpen && <div data-testid="menu-shade" className={styles.shade} onClick={close} />}
    </header>
  );
}
