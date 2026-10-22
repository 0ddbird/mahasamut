import { describe, expect, it } from 'vitest';
import { GAME } from '../games/shared/games';
import { gameMetricLabel, normalizeRoute, parseClientEvent, TRACKED_ROUTES } from './events';

describe('normalizeRoute', () => {
  it('maps known routes to themselves', () => {
    for (const route of TRACKED_ROUTES) {
      if (route === '/other') continue;
      expect(normalizeRoute(route)).toBe(route);
    }
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeRoute('/vowel/')).toBe('/vowel');
    expect(normalizeRoute('/')).toBe('/');
  });

  it('maps /room and /room/:id to /room', () => {
    expect(normalizeRoute('/room')).toBe('/room');
    expect(normalizeRoute('/room/')).toBe('/room');
    expect(normalizeRoute('/room/abc-123')).toBe('/room');
    expect(normalizeRoute('/room/xyz/sub')).toBe('/room');
  });

  it('maps unknown routes to /other', () => {
    expect(normalizeRoute('/unknown')).toBe('/other');
    expect(normalizeRoute('/admin/dashboard')).toBe('/other');
    expect(normalizeRoute('')).toBe('/other');
  });
});

describe('gameMetricLabel', () => {
  it('converts consonantClass to consonant-class and preserves others', () => {
    expect(gameMetricLabel(GAME.ConsonantClass)).toBe('consonant-class');
    expect(gameMetricLabel(GAME.Vowel)).toBe('vowel');
    expect(gameMetricLabel(GAME.Syllable)).toBe('syllable');
  });
});

describe('parseClientEvent', () => {
  it('parses valid page_view events', () => {
    expect(
      parseClientEvent({
        type: 'page_view',
        route: '/vowel',
        device: 'mobile',
      }),
    ).toEqual({
      type: 'page_view',
      route: '/vowel',
      device: 'mobile',
    });

    expect(
      parseClientEvent({
        type: 'page_view',
        route: '/',
        device: 'desktop',
      }),
    ).toEqual({
      type: 'page_view',
      route: '/',
      device: 'desktop',
    });
  });

  it('parses valid solo_game_started and solo_game_finished events', () => {
    expect(
      parseClientEvent({
        type: 'solo_game_started',
        game: 'vowel',
        timed: true,
      }),
    ).toEqual({
      type: 'solo_game_started',
      game: 'vowel',
      timed: true,
    });

    expect(
      parseClientEvent({
        type: 'solo_game_started',
        game: 'consonant-class',
        timed: false,
      }),
    ).toEqual({
      type: 'solo_game_started',
      game: 'consonantClass',
      timed: false,
    });

    expect(
      parseClientEvent({
        type: 'solo_game_finished',
        game: 'syllable',
        timed: false,
      }),
    ).toEqual({
      type: 'solo_game_finished',
      game: 'syllable',
      timed: false,
    });
  });

  it('parses valid audio_listen events', () => {
    expect(
      parseClientEvent({
        type: 'audio_listen',
        context: 'solo',
      }),
    ).toEqual({
      type: 'audio_listen',
      context: 'solo',
    });

    expect(
      parseClientEvent({
        type: 'audio_listen',
        context: 'multi',
      }),
    ).toEqual({
      type: 'audio_listen',
      context: 'multi',
    });
  });

  it('parses valid lobby_link_copied and support_click events', () => {
    expect(parseClientEvent({ type: 'lobby_link_copied' })).toEqual({
      type: 'lobby_link_copied',
    });
    expect(parseClientEvent({ type: 'support_click' })).toEqual({
      type: 'support_click',
    });
  });

  it('rejects invalid inputs and unknown types', () => {
    expect(parseClientEvent(null)).toBeNull();
    expect(parseClientEvent(undefined)).toBeNull();
    expect(parseClientEvent('not an object')).toBeNull();
    expect(parseClientEvent([])).toBeNull();
    expect(parseClientEvent({ type: 'unknown_type' })).toBeNull();
  });

  it('rejects events with extra unexpected fields', () => {
    expect(
      parseClientEvent({
        type: 'support_click',
        extra: 'not allowed',
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'lobby_link_copied',
        foo: 1,
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'page_view',
        route: '/',
        device: 'desktop',
        extra: 'field',
      }),
    ).toBeNull();
  });

  it('rejects events with invalid field values', () => {
    expect(
      parseClientEvent({
        type: 'page_view',
        route: '/untracked-path',
        device: 'desktop',
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'page_view',
        route: '/',
        device: 'tablet',
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'solo_game_started',
        game: 'invalid-game',
        timed: true,
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'solo_game_started',
        game: 'vowel',
        timed: 'yes',
      }),
    ).toBeNull();

    expect(
      parseClientEvent({
        type: 'audio_listen',
        context: 'other',
      }),
    ).toBeNull();
  });
});
