/**
 * The registry of all open rooms in the server's memory: creating rooms with
 * distinct IDs, looking them up, and sweeping those left idle for 30 minutes.
 */
import { generateRoomId } from '../src/multiplayer/roomId';
import type { RoomSettings } from '../src/multiplayer/settings';
import type { Rng } from '../src/thai/generator';
import { IDLE_ROOM_MS, MAX_ROOMS } from './limits';
import { Room } from './room';

export class RoomRegistry {
  private readonly rng: Rng;
  private readonly rooms = new Map<string, Room>();

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  create(
    settings: RoomSettings,
    hostPseudo: string,
    now: number,
  ): { ok: true; room: Room; token: string } | { ok: false; error: 'server-full' } {
    if (this.rooms.size >= MAX_ROOMS) {
      return { ok: false, error: 'server-full' };
    }
    let id = generateRoomId(this.rng);
    while (this.rooms.has(id)) {
      id = generateRoomId(this.rng);
    }
    const { room, token } = Room.create(id, settings, hostPseudo, now, this.rng);
    this.rooms.set(id, room);
    return { ok: true, room, token };
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  sweep(now: number): string[] {
    const removed: string[] = [];
    for (const [id, room] of this.rooms) {
      if (now - room.lastActivity >= IDLE_ROOM_MS) {
        this.rooms.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  counts(): { lobby: number; playing: number; finished: number; connectedPlayers: number } {
    let lobby = 0;
    let playing = 0;
    let finished = 0;
    let connectedPlayers = 0;

    for (const room of this.rooms.values()) {
      switch (room.phaseKind) {
        case 'lobby':
          lobby++;
          break;
        case 'playing':
          playing++;
          break;
        case 'finished':
          finished++;
          break;
      }
      connectedPlayers += room.connectedPlayers;
    }

    return { lobby, playing, finished, connectedPlayers };
  }

  get size(): number {
    return this.rooms.size;
  }
}
