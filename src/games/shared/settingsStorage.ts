/**
 * The last settings a player started each game with, kept in the browser so
 * that the next game starts from them. Only the settings are stored, nothing
 * about the player.
 *
 * Storage can be missing or blocked (private browsing, blocked site data), and
 * what it holds can be stale or edited by hand: neither ever stops the game,
 * which then starts from the defaults.
 */
import type { GameId } from './games';
import { DEFAULT_SETTINGS, parseGameSettings } from './settings';
import type { GameSettings } from './settings';

const storageKey = (game: GameId) => `scriptomancy.settings.${game}`;

/** The settings last saved for `game`; each one unreadable is replaced by its default. */
export function loadSettings(game: GameId): GameSettings {
  try {
    const stored = localStorage.getItem(storageKey(game));
    if (stored === null) return DEFAULT_SETTINGS;
    return parseGameSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Keeps `settings` for the next game of `game`, if the browser lets it. */
export function saveSettings(game: GameId, settings: GameSettings): void {
  try {
    localStorage.setItem(storageKey(game), JSON.stringify(settings));
  } catch {
    // Not remembering the settings is fine: the player can choose them again.
  }
}
