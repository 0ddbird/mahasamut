import { Menu, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { Logo } from '../components/Logo/Logo';
import { GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { useIsLeaveGuarded } from './leaveGuard';
import styles from './SiteBar.module.scss';

/**
 * The bar at the top of every page but the home page: the logo, which always
 * goes home, then a link to each game, the one being played marked. On a
 * narrow screen the games fold into a menu that drops down under the bar.
 *
 * While a game is in progress, its score would be lost: a link of the bar
 * asks the player to confirm before leaving.
 */
export function SiteBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const listId = useId();
  const navigate = useNavigate();
  const guarded = useIsLeaveGuarded();

  // Where a link was about to go while the player confirms, and the link
  // itself, which gets the focus back if they stay.
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const clickedLink = useRef<HTMLAnchorElement | null>(null);

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

  /** The click on a link of the bar to `to`: asks first during a game. */
  const leaveFor = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    close();
    if (!guarded) return;
    event.preventDefault();
    clickedLink.current = event.currentTarget;
    setLeavingTo(to);
  };

  const stay = () => {
    setLeavingTo(null);
    clickedLink.current?.focus();
  };

  const leave = () => {
    if (leavingTo === null) return;
    setLeavingTo(null);
    navigate(leavingTo);
  };

  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.home} onClick={leaveFor('/')}>
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
      {menuOpen && <div data-testid="menu-shade" className={styles.shade} onClick={close} />}
      {leavingTo !== null && (
        <ConfirmDialog
          title="Leave the game?"
          message="Your score will be lost."
          confirmLabel="Leave"
          cancelLabel="Keep playing"
          onConfirm={leave}
          onCancel={stay}
        />
      )}
    </header>
  );
}
