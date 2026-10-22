/**
 * The player's token in a room, kept in `sessionStorage` so a page reload
 * brings them back to their seat without leaking across tabs.
 */
const keyFor = (roomId: string) => `mahasamut.room.${roomId}`;

export function saveToken(roomId: string, token: string): void {
  try {
    sessionStorage.setItem(keyFor(roomId), token);
  } catch {
    // Storage disabled or full: the game still works until the page is reloaded.
  }
}

export function loadToken(roomId: string): string | null {
  try {
    return sessionStorage.getItem(keyFor(roomId));
  } catch {
    return null;
  }
}

export function forgetToken(roomId: string): void {
  try {
    sessionStorage.removeItem(keyFor(roomId));
  } catch {
    // Ignore storage errors.
  }
}
