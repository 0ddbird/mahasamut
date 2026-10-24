import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button/Button';
import { Masthead } from '../components/Masthead/Masthead';
import { GAME_GOALS, GAME_IDS, GAME_NAMES, GAME_PATHS, GAME_SAMPLES } from '../games/shared/games';
import { normalizeRoomId } from '../multiplayer/roomId';
import styles from './HomePage.module.scss';

/**
 * The site home page, over the night sky (see App): the masthead and the
 * tagline, a full-width two-column Multiplayer tile (Create a lobby on the
 * left, Join a lobby on the right), and one tile per solo game below.
 */
export function HomePage() {
  const navigate = useNavigate();
  const roomIdInputId = useId();
  const [roomIdText, setRoomIdText] = useState('');
  const [joinError, setJoinError] = useState(false);

  const joinRoom = () => {
    const normalized = normalizeRoomId(roomIdText);
    if (normalized === null) {
      setJoinError(true);
      return;
    }
    setJoinError(false);
    navigate(`/room/${normalized}`);
  };

  const onJoinSubmit = (event: FormEvent) => {
    event.preventDefault();
    joinRoom();
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>
        <Masthead />
      </h1>
      <p className={styles.tagline}>Games to read Thai script</p>
      <section className={styles.multiplayer} aria-label="Multiplayer">
        <div className={styles.multiColumn}>
          <h2 className={styles.multiTitle}>Play with friends</h2>
          <p className={styles.multiGoal}>Host a live lobby and pick any game.</p>
          <Button onClick={() => navigate('/lobby')}>Create a lobby</Button>
        </div>
        <form className={styles.multiColumn} onSubmit={onJoinSubmit}>
          <h2 className={styles.multiTitle}>Join a lobby</h2>
          <label htmlFor={roomIdInputId} className={styles.joinLabel}>
            Lobby ID
          </label>
          <div className={styles.joinControls}>
            <input
              id={roomIdInputId}
              type="text"
              className={styles.joinInput}
              value={roomIdText}
              onChange={(e) => {
                setRoomIdText(e.target.value);
                if (joinError) setJoinError(false);
              }}
              placeholder="K7P2QX"
            />
            <Button onClick={joinRoom}>Join</Button>
          </div>
          {joinError && (
            <p role="alert" className={styles.joinError}>
              This is not a lobby ID.
            </p>
          )}
        </form>
      </section>
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
                Play
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
