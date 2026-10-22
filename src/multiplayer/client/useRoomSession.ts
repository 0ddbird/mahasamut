/**
 * Manages the browser's session in a room: resuming with a saved token on
 * connection, asking for the room info before joining, receiving `room:state`
 * updates, and exposing the room actions (`join`, `start`, `answer`, `next`,
 * `leave`).
 */
import { useEffect, useState } from 'react';
import type { GameId } from '../../games/shared/games';
import type { AvatarId } from '../avatars';
import type { ActionError, GameAnswer, JoinRoomError, RoomView } from '../protocol';
import type { RoomSocket } from './socket';
import { forgetToken, loadToken, saveToken } from './tokens';

export type RoomSession =
  | { status: 'connecting' }
  | { status: 'joining'; game: GameId; hasPassword: boolean }
  | { status: 'in-room'; view: RoomView }
  | { status: 'unavailable'; reason: 'not-found' | 'started' | 'full' | 'closed' };

export interface RoomActions {
  join(pseudo: string, password: string | null): Promise<JoinRoomError | null>;
  setAvatar(avatar: AvatarId): void;
  start(): void;
  answer(answer: GameAnswer): Promise<ActionError | null>;
  next(): void;
  leave(): void;
}

export function useRoomSession(socket: RoomSocket, roomId: string): [RoomSession, RoomActions] {
  const [session, setSession] = useState<RoomSession>({ status: 'connecting' });

  useEffect(() => {
    let active = true;

    function askInfo() {
      socket.emit('room:info', { roomId }, (res) => {
        if (!active) return;
        if (!res.ok) {
          setSession({ status: 'unavailable', reason: 'not-found' });
          return;
        }
        if (res.status === 'open') {
          setSession({ status: 'joining', game: res.game, hasPassword: res.hasPassword });
        } else {
          setSession({ status: 'unavailable', reason: res.status });
        }
      });
    }

    function onConnect() {
      const token = loadToken(roomId);
      if (token !== null) {
        socket.emit('room:resume', { roomId, token }, (res) => {
          if (!active) return;
          if (!res.ok) {
            forgetToken(roomId);
            if (res.error === 'not-found') {
              setSession({ status: 'unavailable', reason: 'not-found' });
            } else {
              askInfo();
            }
          }
        });
      } else {
        askInfo();
      }
    }

    function onState(view: RoomView) {
      if (!active) return;
      setSession({ status: 'in-room', view });
    }

    function onClosed() {
      if (!active) return;
      forgetToken(roomId);
      setSession({ status: 'unavailable', reason: 'closed' });
    }

    socket.on('connect', onConnect);
    socket.on('room:state', onState);
    socket.on('room:closed', onClosed);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      active = false;
      socket.off('connect', onConnect);
      socket.off('room:state', onState);
      socket.off('room:closed', onClosed);
    };
  }, [socket, roomId]);

  const actions: RoomActions = {
    join(pseudo, password) {
      return new Promise((resolve) => {
        socket.emit('room:join', { roomId, pseudo, password }, (res) => {
          if (res.ok) {
            saveToken(roomId, res.token);
            resolve(null);
          } else {
            resolve(res.error);
          }
        });
      });
    },
    setAvatar(avatar) {
      socket.emit('room:avatar', avatar, () => {});
    },
    start() {
      socket.emit('game:start', () => {});
    },
    answer(answer) {
      return new Promise((resolve) => {
        socket.emit('game:answer', answer, (res) => {
          resolve(res.ok ? null : res.error);
        });
      });
    },
    next() {
      socket.emit('game:next', () => {});
    },
    leave() {
      forgetToken(roomId);
      socket.disconnect();
    },
  };

  return [session, actions];
}
