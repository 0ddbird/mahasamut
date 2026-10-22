import { GAME, GAME_IDS } from '../games/shared/games';
import type { GameId } from '../games/shared/games';

export const TRACKED_ROUTES = [
  '/',
  '/vowel',
  '/vowel/play',
  '/consonant-class',
  '/consonant-class/play',
  '/syllable',
  '/syllable/play',
  '/lobby',
  '/room',
  '/about',
  '/contact',
  '/other',
] as const;

export type TrackedRoute = (typeof TRACKED_ROUTES)[number];

export const DEVICE_TYPES = ['mobile', 'desktop'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const AUDIO_CONTEXTS = ['solo', 'multi'] as const;
export type AudioContextType = (typeof AUDIO_CONTEXTS)[number];

export type ClientEvent =
  | { type: 'page_view'; route: TrackedRoute; device: DeviceType }
  | { type: 'solo_game_started'; game: GameId; timed: boolean }
  | { type: 'solo_game_finished'; game: GameId; timed: boolean }
  | { type: 'audio_listen'; context: AudioContextType }
  | { type: 'lobby_link_copied' }
  | { type: 'support_click' };

export function normalizeRoute(pathname: string): TrackedRoute {
  if (typeof pathname !== 'string') return '/other';
  const clean = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (clean === '/room' || clean.startsWith('/room/')) {
    return '/room';
  }
  if ((TRACKED_ROUTES as readonly string[]).includes(clean)) {
    return clean as TrackedRoute;
  }
  return '/other';
}

export function gameMetricLabel(game: GameId): 'vowel' | 'consonant-class' | 'syllable' {
  if (game === GAME.ConsonantClass) return 'consonant-class';
  return game;
}

function parseGame(val: unknown): GameId | null {
  if (val === 'consonant-class' || val === GAME.ConsonantClass) return GAME.ConsonantClass;
  if (val === GAME.Vowel || val === GAME.Syllable) return val;
  return null;
}

export function parseClientEvent(raw: unknown): ClientEvent | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record);

  switch (record.type) {
    case 'page_view': {
      if (keys.length !== 3) return null;
      const { route, device } = record;
      if (typeof route !== 'string' || !(TRACKED_ROUTES as readonly string[]).includes(route)) {
        return null;
      }
      if (device !== 'mobile' && device !== 'desktop') {
        return null;
      }
      return {
        type: 'page_view',
        route: route as TrackedRoute,
        device,
      };
    }
    case 'solo_game_started': {
      if (keys.length !== 3) return null;
      const { game, timed } = record;
      const parsedGame = parseGame(game);
      if (!parsedGame) return null;
      if (typeof timed !== 'boolean') return null;
      return {
        type: 'solo_game_started',
        game: parsedGame,
        timed,
      };
    }
    case 'solo_game_finished': {
      if (keys.length !== 3) return null;
      const { game, timed } = record;
      const parsedGame = parseGame(game);
      if (!parsedGame) return null;
      if (typeof timed !== 'boolean') return null;
      return {
        type: 'solo_game_finished',
        game: parsedGame,
        timed,
      };
    }
    case 'audio_listen': {
      if (keys.length !== 2) return null;
      const { context } = record;
      if (context !== 'solo' && context !== 'multi') return null;
      return {
        type: 'audio_listen',
        context,
      };
    }
    case 'lobby_link_copied': {
      if (keys.length !== 1) return null;
      return { type: 'lobby_link_copied' };
    }
    case 'support_click': {
      if (keys.length !== 1) return null;
      return { type: 'support_click' };
    }
    default:
      return null;
  }
}
