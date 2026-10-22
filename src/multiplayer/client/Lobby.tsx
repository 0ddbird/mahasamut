import { Button } from '../../components/Button/Button';
import { GAME, GAME_NAMES } from '../../games/shared/games';
import { describeSettings } from '../../games/shared/settingsLabels';
import type { RoomView } from '../protocol';
import styles from './Lobby.module.scss';

interface LobbyProps {
  view: RoomView;
  onStart: () => void;
}

/**
 * The waiting room before the game starts: shows the room ID and link to share,
 * the game's settings, the players present, and lets the host start.
 */
export function Lobby({ view, onStart }: LobbyProps) {
  const roomUrl = `${window.location.origin}/room/${view.roomId}`;
  const settingsLine = describeSettings(
    {
      questionCount: view.settings.questionCount,
      secondsPerQuestion: view.settings.secondsPerQuestion,
      answerMode: view.settings.answerMode,
      learningMode: false,
    },
    view.game === GAME.Syllable,
  );

  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(roomUrl);
    } catch {
      // Ignore clipboard errors.
    }
  };

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[view.game]}</h1>
      <p className={styles.settings}>{settingsLine}</p>
      <section className={styles.share} aria-label="Room link">
        <p className={styles.roomId}>{`Room ${view.roomId}`}</p>
        <p className={styles.url}>{roomUrl}</p>
        <Button onClick={copyLink}>Copy the link</Button>
      </section>
      <section className={styles.playersSection} aria-label="Players">
        <h2 className={styles.heading}>{`Players (${view.players.length})`}</h2>
        <ul className={styles.players}>
          {view.players.map((player) => {
            const tags: string[] = [];
            if (player.isHost) tags.push('(host)');
            if (!player.connected) tags.push('(away)');
            return (
              <li key={player.pseudo} className={styles.player}>
                {tags.length > 0 ? `${player.pseudo} ${tags.join(' ')}` : player.pseudo}
              </li>
            );
          })}
        </ul>
      </section>
      {view.you.isHost ? (
        <Button onClick={onStart}>Start</Button>
      ) : view.host.connected ? (
        <p className={styles.waiting}>Waiting for the host to start…</p>
      ) : (
        <p className={styles.waiting}>The host is away.</p>
      )}
    </main>
  );
}
