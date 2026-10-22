import { useId } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button/Button';
import { GAME_NAMES } from '../../games/shared/games';
import type { RoomView } from '../protocol';
import { Avatar } from './Avatar';
import styles from './FinalScreen.module.scss';
import { Ranking } from './Ranking';

interface FinalScreenProps {
  view: RoomView;
  onReturnToLobby?: () => void;
}

/** Classic podium step order: 2nd on the left, 1st in the center, 3rd on the right. */
const PODIUM_STEPS = [2, 1, 3] as const;

/**
 * The final screen of a multiplayer game: a 3-step visual podium (2nd – 1st –
 * 3rd) with avatars and nicknames (ties included), the full ranking with
 * avatar miniatures, a button for the host to bring everyone back to the lobby,
 * and a link back home.
 */
export function FinalScreen({ view, onReturnToLobby }: FinalScreenProps) {
  const podiumHeadingId = useId();
  const fullHeadingId = useId();
  const { phase } = view;
  if (phase.kind !== 'finished') return null;

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[view.game]}</h1>
      <section className={styles.section} aria-labelledby={podiumHeadingId}>
        <h2 id={podiumHeadingId} className={styles.heading}>
          Podium
        </h2>
        <div className={styles.podium}>
          {PODIUM_STEPS.map((stepRank) => {
            const stepPlayers = phase.ranking.filter((entry) => entry.rank === stepRank);
            return (
              <div
                key={stepRank}
                className={styles.podiumColumn}
                data-rank={stepRank}
                aria-label={`Rank ${stepRank}`}
              >
                <div className={styles.podiumPlayers}>
                  {stepPlayers.map((entry) => (
                    <div
                      key={entry.pseudo}
                      className={styles.podiumPlayer}
                      data-you={entry.isYou || undefined}
                    >
                      <Avatar avatar={entry.avatar} size="medium" />
                      <span className={styles.podiumPseudo}>{entry.pseudo}</span>
                      <span className={styles.podiumScore}>{entry.score}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.podiumStep} data-rank={stepRank}>
                  {stepRank}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className={styles.section} aria-labelledby={fullHeadingId}>
        <h2 id={fullHeadingId} className={styles.heading}>
          Full ranking
        </h2>
        <Ranking entries={phase.ranking} />
      </section>
      {view.you.isHost && <Button onClick={() => onReturnToLobby?.()}>Back to lobby</Button>}
      <Link to="/" className={styles.homeLink}>
        Back to the home page
      </Link>
    </main>
  );
}
