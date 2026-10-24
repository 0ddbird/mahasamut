import { Check, Crown } from 'lucide-react';
import type { PlayerView } from '../protocol';
import { Avatar } from './Avatar';
import styles from './PlayersPanel.module.scss';

interface PlayersPanelProps {
  players: readonly PlayerView[];
  /** The pseudos of the players who have answered the open question. */
  answered: readonly string[];
  you: string;
}

/**
 * The players of a game in progress, beside the question: their avatar, the
 * host's crown, a tick once they have answered, dimmed while away. A column on
 * a wide screen; under the question on a phone, in a grid that keeps it short.
 */
export function PlayersPanel({ players, answered, you }: PlayersPanelProps) {
  const answeredSet = new Set(answered);
  return (
    <section className={styles.section} aria-label="Players">
      <h2 className={styles.heading}>{`Players (${players.length})`}</h2>
      <ul className={styles.players}>
        {players.map((player) => (
          <li
            key={player.pseudo}
            className={styles.player}
            data-away={!player.connected || undefined}
          >
            <Avatar avatar={player.avatar} size="small" />
            <span className={styles.name}>
              {player.pseudo === you ? `${player.pseudo} (you)` : player.pseudo}
            </span>
            {player.isHost && (
              <Crown size={16} className={styles.hostIcon} role="img" aria-label="Host" />
            )}
            {!player.connected && <span className={styles.away}>(away)</span>}
            {answeredSet.has(player.pseudo) && (
              <Check size={16} className={styles.answered} role="img" aria-label="Answered" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
