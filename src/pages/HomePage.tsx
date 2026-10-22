import { Link } from 'react-router';
import { Logo } from '../components/Logo/Logo';
import { GAME_GOALS, GAME_IDS, GAME_NAMES, GAME_PATHS, GAME_SAMPLES } from '../games/shared/games';
import styles from './HomePage.module.scss';

/**
 * The site home page: the logo, then one tile per game. A whole tile is the
 * link to the game's settings; its Play is only a visual cue.
 */
export function HomePage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>
        <Logo size="large" />
      </h1>
      <p className={styles.tagline}>Games to read Thai script</p>
      <ul className={styles.tiles}>
        {GAME_IDS.map((game) => (
          <li key={game}>
            <Link className={styles.tile} to={GAME_PATHS[game]}>
              <span lang="th" className={styles.sample}>
                {GAME_SAMPLES[game]}
              </span>
              <span className={styles.name}>{GAME_NAMES[game]}</span>
              <span className={styles.goal}>{GAME_GOALS[game]}</span>
              <span className={styles.play} aria-hidden="true">
                ▶ Play
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
