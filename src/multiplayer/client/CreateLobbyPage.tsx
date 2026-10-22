import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button/Button';
import type { CreateRoomError } from '../protocol';
import { PSEUDO_MAX_LENGTH } from '../pseudo';
import { PASSWORD_MAX_LENGTH } from '../settings';
import styles from './CreateLobbyPage.module.scss';
import { getRoomSocket } from './socket';
import type { RoomSocket } from './socket';
import { saveToken } from './tokens';

const CREATE_ERROR_MESSAGES: Record<CreateRoomError, string> = {
  'invalid-pseudo': 'Choose a nickname of 1 to 20 characters.',
  'server-full': 'The server is full, try again in a few minutes.',
  'invalid-settings': 'These settings are not valid.',
};

interface CreateLobbyPageProps {
  socket?: RoomSocket;
}

/**
 * The page at `/lobby`: asks the host for their nickname and an optional
 * password, creates the room with default settings, and enters the lobby where
 * the game and settings can be adjusted live.
 */
export function CreateLobbyPage({ socket = getRoomSocket() }: CreateLobbyPageProps) {
  const navigate = useNavigate();
  const nicknameId = useId();
  const passwordId = useId();
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<CreateRoomError | null>(null);

  const create = () => {
    setError(null);
    if (!socket.connected) socket.connect();
    socket.emit(
      'room:create',
      {
        settings: { password },
        pseudo,
      },
      (res) => {
        if (res.ok) {
          saveToken(res.roomId, res.token);
          navigate(`/room/${res.roomId}`);
        } else {
          setError(res.error);
        }
      },
    );
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    create();
  };

  return (
    <main className={styles.page}>
      <h1>Create a lobby</h1>
      <form className={styles.card} onSubmit={onFormSubmit}>
        <div className={styles.field}>
          <label htmlFor={nicknameId} className={styles.label}>
            Your nickname
          </label>
          <input
            id={nicknameId}
            type="text"
            className={styles.input}
            maxLength={PSEUDO_MAX_LENGTH}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={passwordId} className={styles.label}>
            Password (optional)
          </label>
          <input
            id={passwordId}
            type="password"
            className={styles.input}
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error !== null && (
          <p role="alert" className={styles.error}>
            {CREATE_ERROR_MESSAGES[error]}
          </p>
        )}
        <Button onClick={create}>Create lobby</Button>
      </form>
    </main>
  );
}
