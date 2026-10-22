import { useId } from 'react';
import { Link } from 'react-router';
import { GAME_NAMES } from '../../games/shared/games';
import type { RoomView } from '../protocol';
import styles from './FinalScreen.module.scss';
import { Ranking } from './Ranking';

interface FinalScreenProps {
  view: RoomView;
}

/**
 * The final screen of a multiplayer game: the podium of the top 3 ranks (ties
 * included), the full ranking, and a link back home.
 */
export function FinalScreen({ view }: FinalScreenProps) {
  const podiumHeadingId = useId();
  const fullHeadingId = useId();
  const { phase } = view;
  if (phase.kind !== 'finished') return null;

  const podium = phase.ranking.filter((entry) => entry.rank <= 3);

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[view.game]}</h1>
      <section className={styles.section} aria-labelledby={podiumHeadingId}>
        <h2 id={podiumHeadingId} className={styles.heading}>
          Podium
        </h2>
        <Ranking entries={podium} />
      </section>
      <section className={styles.section} aria-labelledby={fullHeadingId}>
        <h2 id={fullHeadingId} className={styles.heading}>
          Full ranking
        </h2>
        <Ranking entries={phase.ranking} />
      </section>
      <Link to="/" className={styles.homeLink}>
        Back to the home page
      </Link>
    </main>
  );
}
