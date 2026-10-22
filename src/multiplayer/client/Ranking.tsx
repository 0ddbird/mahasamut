import type { RankingEntry } from '../protocol';
import styles from './Ranking.module.scss';

interface RankingProps {
  entries: readonly RankingEntry[];
}

/**
 * The ordered list of players in a room, with their rank and total score.
 */
export function Ranking({ entries }: RankingProps) {
  return (
    <ol className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.pseudo} className={styles.item} data-you={entry.isYou || undefined}>
          {`${entry.rank}. ${entry.pseudo}${entry.isYou ? ' (you)' : ''} — ${entry.score}`}
        </li>
      ))}
    </ol>
  );
}
