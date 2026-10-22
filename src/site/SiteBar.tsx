import { Menu, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Logo } from '../components/Logo/Logo';
import { GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { useGameEnd, useLeaveLink } from './leaveGuard';
import styles from './SiteBar.module.scss';

/**
 * The bar at the top of every page but the home page: the logo, which always
 * goes home, then a link to each game, the one being played marked. On a
 * narrow screen the games fold into a menu that drops down under the bar.
 *
 * While a game is in progress, End takes the place of the games, on the right:
 * the player is in the game, not choosing one. Its score would be lost: the
 * logo asks the player to confirm before leaving.
 */
export function SiteBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const listId = useId();
  const endGame = useGameEnd();
  const leaveLink = useLeaveLink();
  const menuButton = useRef<HTMLButtonElement>(null);

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

  // Tab past the last game would reach the page behind the shade: the menu
  // closes as soon as the focus leaves it.
  const closeOnFocusOut = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  };

  /**
   * The click on a link of the bar to `to`: it closes the menu, and asks first
   * during a game. If the player stays, the focus goes back to the link, or to
   * the menu button when the link was in the menu, which closes and hides it.
   */
  const leaveFor = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const inMenu = menuOpen;
    close();
    leaveLink(to, inMenu ? () => menuButton.current : undefined)(event);
  };

  return (
    <header className={styles.bar} data-menu-open={menuOpen || undefined}>
      <Link to="/" className={styles.home} onClick={leaveFor('/')}>
        <Logo size="small" />
      </Link>
      {endGame !== null ? (
        <button type="button" className={styles.end} onClick={endGame}>
          End
        </button>
      ) : (
        <nav aria-label="Games" onKeyDown={closeOnEscape} onBlur={closeOnFocusOut}>
          <button
            ref={menuButton}
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
                <NavLink
                  to={GAME_PATHS[game]}
                  className={styles.link}
                  onClick={leaveFor(GAME_PATHS[game])}
                >
                  {GAME_NAMES[game]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {menuOpen && <div data-testid="menu-shade" className={styles.shade} onClick={close} />}
    </header>
  );
}
