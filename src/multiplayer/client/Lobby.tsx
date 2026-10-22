import { ChevronLeft, ChevronRight, Crown, Layers, ListChecks, Timer } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { GAME, GAME_NAMES } from '../../games/shared/games';
import { ANSWER_MODE } from '../../games/shared/settings';
import { AVATAR_LABELS, cycleAvatar } from '../avatars';
import type { AvatarId } from '../avatars';
import type { RoomView } from '../protocol';
import { Avatar } from './Avatar';
import styles from './Lobby.module.scss';

interface LobbyProps {
  view: RoomView;
  onStart: () => void;
  onChangeAvatar?: (avatar: AvatarId) => void;
}

/**
 * The waiting room before the game starts: shows the lobby ID and link to
 * share, a compact card of the game's settings, a Gartic-Phone-style Thai
 * avatar picker, the list of players with a crown for the host, and lets the
 * host start.
 */
export function Lobby({ view, onStart, onChangeAvatar }: LobbyProps) {
  const roomUrl = `${window.location.origin}/room/${view.roomId}`;
  const answerLabel =
    view.settings.answerMode === ANSWER_MODE.ToneOnly ? 'Tone only' : 'Full reasoning';

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
      <section className={styles.settingsCard} aria-label="Settings">
        <span className={styles.settingItem}>
          <Layers size={16} className={styles.settingIcon} aria-hidden="true" />
          {`${view.settings.questionCount} questions`}
        </span>
        <span className={styles.settingItem}>
          <Timer size={16} className={styles.settingIcon} aria-hidden="true" />
          {`${view.settings.secondsPerQuestion} s per question`}
        </span>
        {view.game === GAME.Syllable && (
          <span className={styles.settingItem}>
            <ListChecks size={16} className={styles.settingIcon} aria-hidden="true" />
            {answerLabel}
          </span>
        )}
      </section>
      <section className={styles.share} aria-label="Lobby link">
        <p className={styles.roomId}>{`Lobby ${view.roomId}`}</p>
        <p className={styles.url}>{roomUrl}</p>
        <Button onClick={copyLink}>Copy the link</Button>
      </section>
      <section className={styles.avatarCard} aria-label="Your avatar">
        <h2 className={styles.heading}>Your avatar</h2>
        <div className={styles.avatarPicker}>
          <button
            type="button"
            className={styles.cycleButton}
            aria-label="Previous avatar"
            onClick={() => onChangeAvatar?.(cycleAvatar(view.you.avatar, -1))}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div className={styles.avatarPreview}>
            <Avatar avatar={view.you.avatar} size="large" />
            <span className={styles.avatarName}>{AVATAR_LABELS[view.you.avatar]}</span>
          </div>
          <button
            type="button"
            className={styles.cycleButton}
            aria-label="Next avatar"
            onClick={() => onChangeAvatar?.(cycleAvatar(view.you.avatar, 1))}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={styles.playersSection} aria-label="Players">
        <h2 className={styles.heading}>{`Players (${view.players.length})`}</h2>
        <ul className={styles.players}>
          {view.players.map((player) => (
            <li key={player.pseudo} className={styles.player}>
              <Avatar avatar={player.avatar} size="small" />
              <span className={styles.playerName}>{player.pseudo}</span>
              {player.isHost && (
                <Crown size={16} className={styles.hostIcon} role="img" aria-label="Host" />
              )}
              {!player.connected && <span className={styles.away}>(away)</span>}
            </li>
          ))}
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
