/**
 * Creates the HTTP + Socket.IO server for multiplayer rooms and schedules the
 * periodic sweep of idle rooms.
 */
import http from 'node:http';
import { Server } from 'socket.io';
import { MAX_MESSAGE_BYTES, SWEEP_INTERVAL_MS } from './limits';
import { RoomRegistry } from './registry';
import { attachRooms } from './socket';
import type { RoomServer } from './socket';

export function createRoomServer(options: { now?: () => number } = {}): {
  httpServer: http.Server;
  io: RoomServer;
  sweep(): void;
  close(): Promise<void>;
} {
  const httpServer = http.createServer();
  const io: RoomServer = new Server(httpServer, {
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
  });
  const registry = new RoomRegistry();
  const rooms = attachRooms(io, registry, options.now);
  const sweepTimer = setInterval(() => rooms.sweep(), SWEEP_INTERVAL_MS);

  async function close(): Promise<void> {
    clearInterval(sweepTimer);
    rooms.close();
    await new Promise<void>((resolve) => {
      void io.close(() => resolve());
    });
  }

  return {
    httpServer,
    io,
    sweep: rooms.sweep,
    close,
  };
}
