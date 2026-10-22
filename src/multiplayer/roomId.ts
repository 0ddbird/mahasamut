/**
 * Room IDs: short enough to dictate to a class or type on a phone, in the
 * room's URL (`/room/<ID>`).
 */
import type { Rng } from '../thai/generator';

/** Capital letters and digits, without those easily mixed up: 0 and O, 1, I and L. */
export const ROOM_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_ID_LENGTH = 6;

/**
 * Draws a room ID. The server draws again if it is already taken.
 *
 * @param rng source of random numbers in [0, 1), such as `Math.random`.
 */
export function generateRoomId(rng: Rng): string {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_ALPHABET[Math.floor(rng() * ROOM_ID_ALPHABET.length)];
  }
  return id;
}

/**
 * Reads a room ID as a player types it: spaces dropped, any case.
 *
 * @returns the ID in capitals, or null if it cannot be a room ID.
 */
export function normalizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.replace(/\s/g, '').toUpperCase();
  if (id.length !== ROOM_ID_LENGTH) return null;
  if (![...id].every((char) => ROOM_ID_ALPHABET.includes(char))) return null;
  return id;
}
