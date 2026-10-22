import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button/Button';
import { GAME_NAMES } from '../../games/shared/games';
import type { GameId } from '../../games/shared/games';
import type { JoinRoomError } from '../protocol';
import { PSEUDO_MAX_LENGTH } from '../pseudo';
import { PASSWORD_MAX_LENGTH } from '../settings';
import styles from './JoinForm.module.scss';

const JOIN_ERROR_MESSAGES: Record<JoinRoomError, string> = {
  'not-found': 'This room does not exist.',
  started: 'This game has already started.',
  'room-full': 'This room is full.',
  'wrong-password': 'Wrong password.',
  'too-many-attempts': 'Too many wrong passwords.',
  'invalid-pseudo': 'Choose a nickname of 1 to 20 characters.',
  'pseudo-taken': 'This nickname is already taken.',
};

interface JoinFormProps {
  game: GameId;
  hasPassword: boolean;
  onJoin: (pseudo: string, password: string | null) => Promise<JoinRoomError | null>;
}

/**
 * Asks a newcomer for their nickname, and the room's password when it has one,
 * before they enter the lobby.
 */
export function JoinForm({ game, hasPassword, onJoin }: JoinFormProps) {
  const nicknameId = useId();
  const passwordId = useId();
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<JoinRoomError | null>(null);

  const submit = async () => {
    setError(null);
    const err = await onJoin(pseudo, hasPassword ? password : null);
    if (err !== null) setError(err);
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <main className={styles.page}>
      <h1>{`Join the room · ${GAME_NAMES[game]}`}</h1>
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
        {hasPassword && (
          <div className={styles.field}>
            <label htmlFor={passwordId} className={styles.label}>
              Password
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
        )}
        {error !== null && (
          <p role="alert" className={styles.error}>
            {JOIN_ERROR_MESSAGES[error]}
          </p>
        )}
        <Button onClick={() => void submit()}>Join</Button>
      </form>
    </main>
  );
}
