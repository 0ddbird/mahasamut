/**
 * Server-wide limits and durations against abuse and abandoned rooms.
 */
export const MAX_ROOMS = 200;
export const MAX_PLAYERS_PER_ROOM = 100;
export const MAX_PASSWORD_ATTEMPTS = 5;
export const MAX_MESSAGE_BYTES = 16_384;
export const IDLE_ROOM_MS = 30 * 60_000;
export const SWEEP_INTERVAL_MS = 60_000;
