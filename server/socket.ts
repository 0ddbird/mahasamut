/**
 * Socket.IO glue around `RoomRegistry` and `Room`: attaches sockets to rooms,
 * schedules the per-question timer, broadcasts each player's own `RoomView`,
 * and sweeps idle rooms.
 */
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/multiplayer/protocol';
import { normalizePseudo } from '../src/multiplayer/pseudo';
import { normalizeRoomId } from '../src/multiplayer/roomId';
import { parseRoomSettings } from '../src/multiplayer/settings';
import { MAX_PASSWORD_ATTEMPTS } from './limits';
import type { RoomRegistry } from './registry';
import type { Room } from './room';

export interface SocketData {
  roomId?: string;
  token?: string;
  passwordAttempts: Record<string, number>;
}

export type RoomServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type RoomSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function attachRooms(
  io: RoomServer,
  registry: RoomRegistry,
  now: () => number = Date.now,
): { sweep(): void; close(): void } {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function clearRoomTimer(roomId: string): void {
    const timer = timers.get(roomId);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(roomId);
    }
  }

  function broadcastRoom(room: Room): void {
    const currentNow = now();
    for (const sock of io.sockets.sockets.values()) {
      const token = sock.data.token;
      if (sock.data.roomId === room.id && token && room.hasPlayer(token)) {
        sock.emit('room:state', room.viewFor(token, currentNow));
      }
    }
  }

  function syncRoomTimer(room: Room): void {
    clearRoomTimer(room.id);
    const deadline = room.deadline;
    if (deadline === null) return;
    const delayMs = Math.max(0, deadline - now());
    const timer = setTimeout(() => {
      timers.delete(room.id);
      if (room.expire(now())) {
        broadcastRoom(room);
      }
    }, delayMs);
    timers.set(room.id, timer);
  }

  function detachSocket(socket: RoomSocket): void {
    const { roomId, token } = socket.data;
    if (!roomId || !token) return;
    socket.data.roomId = undefined;
    socket.data.token = undefined;
    void socket.leave(roomId);
    const room = registry.get(roomId);
    if (room) {
      room.disconnect(token, now());
      syncRoomTimer(room);
      broadcastRoom(room);
    }
  }

  function attachSocket(socket: RoomSocket, room: Room, token: string): void {
    if (socket.data.roomId === room.id && socket.data.token === token) {
      broadcastRoom(room);
      return;
    }
    detachSocket(socket);
    socket.data.roomId = room.id;
    socket.data.token = token;
    void socket.join(room.id);
    room.connect(token, now());
    broadcastRoom(room);
  }

  io.on('connection', (socket) => {
    socket.data.passwordAttempts = {};

    socket.on('room:create', (req, ack) => {
      if (typeof ack !== 'function') return;
      try {
        if (typeof req !== 'object' || req === null) {
          ack({ ok: false, error: 'invalid-settings' });
          return;
        }
        const settings = parseRoomSettings(req.settings);
        if (!settings) {
          ack({ ok: false, error: 'invalid-settings' });
          return;
        }
        const pseudo = normalizePseudo(req.pseudo);
        if (!pseudo) {
          ack({ ok: false, error: 'invalid-pseudo' });
          return;
        }
        const created = registry.create(settings, pseudo, now());
        if (!created.ok) {
          ack(created);
          return;
        }
        attachSocket(socket, created.room, created.token);
        ack({ ok: true, roomId: created.room.id, token: created.token });
      } catch {
        ack({ ok: false, error: 'invalid-settings' });
      }
    });

    socket.on('room:info', (req, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const roomId = typeof req === 'object' && req !== null ? normalizeRoomId(req.roomId) : null;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room) {
          ack({ ok: false, error: 'not-found' });
          return;
        }
        ack({
          ok: true,
          game: room.settings.game,
          hasPassword: room.settings.password !== null,
          status: room.status,
        });
      } catch {
        ack({ ok: false, error: 'not-found' });
      }
    });

    socket.on('room:join', (req, ack) => {
      if (typeof ack !== 'function') return;
      try {
        if (typeof req !== 'object' || req === null) {
          ack({ ok: false, error: 'not-found' });
          return;
        }
        const roomId = normalizeRoomId(req.roomId);
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !roomId) {
          ack({ ok: false, error: 'not-found' });
          return;
        }
        const attempts = socket.data.passwordAttempts[roomId] ?? 0;
        if (attempts >= MAX_PASSWORD_ATTEMPTS) {
          ack({ ok: false, error: 'too-many-attempts' });
          return;
        }
        const pseudo = normalizePseudo(req.pseudo);
        if (!pseudo) {
          ack({ ok: false, error: 'invalid-pseudo' });
          return;
        }
        const password = typeof req.password === 'string' ? req.password : null;
        const joined = room.join(pseudo, password, now());
        if (!joined.ok) {
          if (joined.error === 'wrong-password') {
            socket.data.passwordAttempts[roomId] = attempts + 1;
          }
          ack(joined);
          return;
        }
        attachSocket(socket, room, joined.token);
        ack({ ok: true, token: joined.token });
      } catch {
        ack({ ok: false, error: 'not-found' });
      }
    });

    socket.on('room:resume', (req, ack) => {
      if (typeof ack !== 'function') return;
      try {
        if (typeof req !== 'object' || req === null) {
          ack({ ok: false, error: 'not-found' });
          return;
        }
        const roomId = normalizeRoomId(req.roomId);
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room) {
          ack({ ok: false, error: 'not-found' });
          return;
        }
        if (typeof req.token !== 'string' || !room.hasPlayer(req.token)) {
          ack({ ok: false, error: 'unknown-token' });
          return;
        }
        attachSocket(socket, room, req.token);
        ack({ ok: true });
      } catch {
        ack({ ok: false, error: 'not-found' });
      }
    });

    socket.on('room:avatar', (avatar, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.setAvatar(token, avatar, now());
        if (outcome.ok) {
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('room:settings', (settings, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.updateSettings(token, settings, now());
        if (outcome.ok) {
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('game:start', (ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.start(token, now());
        if (outcome.ok) {
          syncRoomTimer(room);
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('game:answer', (answer, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.answer(token, answer, now());
        if (outcome.ok || outcome.error === 'too-late') {
          syncRoomTimer(room);
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('game:next', (ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.next(token, now());
        if (outcome.ok) {
          syncRoomTimer(room);
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('game:lobby', (ack) => {
      if (typeof ack !== 'function') return;
      try {
        const { roomId, token } = socket.data;
        const room = roomId ? registry.get(roomId) : undefined;
        if (!room || !token) {
          ack({ ok: false, error: 'not-in-room' });
          return;
        }
        const outcome = room.returnToLobby(token, now());
        if (outcome.ok) {
          syncRoomTimer(room);
          broadcastRoom(room);
        }
        ack(outcome);
      } catch {
        ack({ ok: false, error: 'not-in-room' });
      }
    });

    socket.on('room:leave', () => {
      const { roomId, token } = socket.data;
      if (!roomId || !token) return;
      socket.data.roomId = undefined;
      socket.data.token = undefined;
      void socket.leave(roomId);
      const room = registry.get(roomId);
      if (room) {
        room.leave(token, now());
        syncRoomTimer(room);
        broadcastRoom(room);
      }
    });

    socket.on('disconnect', () => {
      detachSocket(socket);
    });
  });

  function sweep(): void {
    const removed = registry.sweep(now());
    for (const roomId of removed) {
      clearRoomTimer(roomId);
      io.in(roomId).emit('room:closed');
      for (const sock of io.sockets.sockets.values()) {
        if (sock.data.roomId === roomId) {
          sock.data.roomId = undefined;
          sock.data.token = undefined;
          void sock.leave(roomId);
        }
      }
    }
  }

  function close(): void {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
  }

  return { sweep, close };
}
