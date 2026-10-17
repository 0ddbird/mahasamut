/**
 * The nickname a player picks to join a room. It only lives in the server's
 * memory, for as long as the room does.
 */

/** In characters, so that a Thai or emoji nickname gets the same room as a Latin one. */
export const PSEUDO_MAX_LENGTH = 20;

// Control characters (line breaks, NUL…) would break the display of the ranking.
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Reads a nickname sent by a client: trimmed, 1 to 20 characters, no control
 * characters.
 *
 * @returns null if it cannot be a nickname.
 */
export function normalizePseudo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const pseudo = raw.trim();
  // Counted in code points: an emoji is one character, not two UTF-16 units.
  const length = [...pseudo].length;
  if (length < 1 || length > PSEUDO_MAX_LENGTH) return null;
  if (CONTROL_CHARACTER.test(pseudo)) return null;
  return pseudo;
}

/** What two nicknames are compared on: "Marie" and "marie" are the same player. */
export function pseudoKey(pseudo: string): string {
  return pseudo.toLowerCase();
}
