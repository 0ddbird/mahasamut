import type { RankingEntry } from '../protocol';
import { Avatar } from './Avatar';
import styles from './Ranking.module.scss';

interface RankingProps {
  entries: readonly RankingEntry[];
}

/**
 * The ordered list of players in a room, with a small Thai avatar miniature,
 * their rank, their nickname, and their total score.
 */
export function Ranking({ entries }: RankingProps) {
  return (
    <ol className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.pseudo} className={styles.item} data-you={entry.isYou || undefined}>
          <Avatar avatar={entry.avatar} size="small" />
          <span>{`${entry.rank}. ${entry.pseudo}${entry.isYou ? ' (you)' : ''} — ${entry.score}`}</span>
        </li>
      ))}
    </ol>
  );
}
