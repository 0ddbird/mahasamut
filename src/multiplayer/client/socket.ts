/**
 * The single Socket.IO connection of the browser tab, created lazily and not
 * connected until a room page or room creation asks for it.
 */
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../protocol';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: RoomSocket | null = null;

export function getRoomSocket(): RoomSocket {
  if (sharedSocket === null) {
    sharedSocket = io({ autoConnect: false });
  }
  return sharedSocket;
}
