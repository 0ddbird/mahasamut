import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/games/shared/games';
import { MetricsStore } from './store';

describe('MetricsStore', () => {
  it('records client events in counters and daily_counters', () => {
    const store = new MetricsStore(':memory:');
    const day1 = new Date('2026-10-22T10:00:00Z').getTime();

    store.recordClientEvent({ type: 'page_view', route: '/', device: 'desktop' }, day1);
    store.recordClientEvent({ type: 'page_view', route: '/', device: 'desktop' }, day1);
    store.recordClientEvent(
      { type: 'solo_game_started', game: GAME.ConsonantClass, timed: true },
      day1,
    );
    store.recordClientEvent(
      { type: 'solo_game_finished', game: GAME.ConsonantClass, timed: true },
      day1,
    );
    store.recordClientEvent({ type: 'audio_listen', context: 'solo' }, day1);
    store.recordClientEvent({ type: 'lobby_link_copied' }, day1);
    store.recordClientEvent({ type: 'support_click' }, day1);

    const counters = store.getCounters();
    expect(counters).toEqual(
      expect.arrayContaining([
        {
          name: 'mahasamut_page_views_total',
          labels: 'device="desktop",route="/"',
          value: 2,
        },
        {
          name: 'mahasamut_solo_games_started_total',
          labels: 'game="consonant-class",timed="true"',
          value: 1,
        },
        {
          name: 'mahasamut_solo_games_finished_total',
          labels: 'game="consonant-class",timed="true"',
          value: 1,
        },
        {
          name: 'mahasamut_audio_listen_total',
          labels: 'context="solo"',
          value: 1,
        },
        {
          name: 'mahasamut_lobby_link_copied_total',
          labels: '',
          value: 1,
        },
        {
          name: 'mahasamut_support_clicks_total',
          labels: '',
          value: 1,
        },
      ]),
    );

    const daily = store.getDailyCounters('2026-10-22');
    expect(daily.length).toBeGreaterThanOrEqual(6);
    expect(daily.find((d) => d.name === 'mahasamut_page_views_total')?.value).toBe(2);

    store.close();
  });

  it('records contact outcome and room lifecycle events', () => {
    const store = new MetricsStore(':memory:');
    const day = new Date('2026-10-22T12:00:00Z').getTime();

    store.recordContactOutcome('sent', day);
    store.recordRoomCreated(true, day);
    store.recordRoomCreated(false, day);
    store.recordMultiGameFinished(GAME.Vowel, day);
    store.recordMultiBackToLobby(day);

    const counters = store.getCounters();
    expect(counters).toEqual(
      expect.arrayContaining([
        {
          name: 'mahasamut_contact_requests_total',
          labels: 'outcome="sent"',
          value: 1,
        },
        {
          name: 'mahasamut_rooms_created_total',
          labels: 'has_password="true"',
          value: 1,
        },
        {
          name: 'mahasamut_rooms_created_total',
          labels: 'has_password="false"',
          value: 1,
        },
        {
          name: 'mahasamut_multi_games_finished_total',
          labels: 'game="vowel"',
          value: 1,
        },
        {
          name: 'mahasamut_multi_back_to_lobby_total',
          labels: '',
          value: 1,
        },
      ]),
    );

    store.close();
  });

  it('records multiplayer game start with histogram buckets, sum, and count', () => {
    const store = new MetricsStore(':memory:');
    const day = new Date('2026-10-22T14:00:00Z').getTime();

    // Game 1 with 2 players
    store.recordMultiGameStarted(GAME.Syllable, 2, day);
    // Game 2 with 4 players
    store.recordMultiGameStarted(GAME.Syllable, 4, day);

    const counters = store.getCounters();

    expect(
      counters.find((c) => c.name === 'mahasamut_multi_games_started_total'),
    ).toEqual({
      name: 'mahasamut_multi_games_started_total',
      labels: 'game="syllable"',
      value: 2,
    });

    expect(
      counters.find((c) => c.name === 'mahasamut_multi_players_started_total'),
    ).toEqual({
      name: 'mahasamut_multi_players_started_total',
      labels: 'game="syllable"',
      value: 6,
    });

    expect(counters.find((c) => c.name === 'mahasamut_multi_room_players_sum')).toEqual({
      name: 'mahasamut_multi_room_players_sum',
      labels: '',
      value: 6,
    });

    expect(counters.find((c) => c.name === 'mahasamut_multi_room_players_count')).toEqual({
      name: 'mahasamut_multi_room_players_count',
      labels: '',
      value: 2,
    });

    // Bucket le="1": 0 (neither <= 1)
    expect(
      counters.find(
        (c) => c.name === 'mahasamut_multi_room_players_bucket' && c.labels === 'le="1"',
      ),
    ).toBeUndefined();

    // Bucket le="2": 1 (game 1 had 2)
    expect(
      counters.find(
        (c) => c.name === 'mahasamut_multi_room_players_bucket' && c.labels === 'le="2"',
      )?.value,
    ).toBe(1);

    // Bucket le="3": 1 (game 1 had 2 <= 3)
    expect(
      counters.find(
        (c) => c.name === 'mahasamut_multi_room_players_bucket' && c.labels === 'le="3"',
      )?.value,
    ).toBe(1);

    // Bucket le="5": 2 (both 2 and 4 <= 5)
    expect(
      counters.find(
        (c) => c.name === 'mahasamut_multi_room_players_bucket' && c.labels === 'le="5"',
      )?.value,
    ).toBe(2);

    // Bucket le="+Inf": 2
    expect(
      counters.find(
        (c) => c.name === 'mahasamut_multi_room_players_bucket' && c.labels === 'le="+Inf"',
      )?.value,
    ).toBe(2);

    store.close();
  });

  it('persists counters across store restarts using file storage', () => {
    const tmpPath = join(tmpdir(), `mahasamut-test-metrics-${Date.now()}.db`);

    try {
      const store1 = new MetricsStore(tmpPath);
      store1.recordClientEvent(
        { type: 'support_click' },
        new Date('2026-10-22T10:00:00Z').getTime(),
      );
      store1.close();

      const store2 = new MetricsStore(tmpPath);
      store2.recordClientEvent(
        { type: 'support_click' },
        new Date('2026-10-22T11:00:00Z').getTime(),
      );

      const counters = store2.getCounters();
      expect(counters.find((c) => c.name === 'mahasamut_support_clicks_total')?.value).toBe(2);

      const daily = store2.getDailyCounters('2026-10-22');
      expect(daily.find((d) => d.name === 'mahasamut_support_clicks_total')?.value).toBe(2);

      store2.close();
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
  });

  it('formats Prometheus text output matching live gauges and counters', () => {
    const store = new MetricsStore(':memory:');
    const day = new Date('2026-10-22T10:00:00Z').getTime();

    store.recordClientEvent({ type: 'page_view', route: '/', device: 'desktop' }, day);
    store.recordMultiGameStarted(GAME.Vowel, 3, day);

    const output = store.formatPrometheus({
      activeRooms: { lobby: 2, playing: 1, finished: 0 },
      connectedPlayers: 5,
      processRssBytes: 42_000_000,
      processUptimeSeconds: 120,
    });

    expect(output).toContain('# HELP mahasamut_active_rooms Currently active multiplayer rooms\n');
    expect(output).toContain('# TYPE mahasamut_active_rooms gauge\n');
    expect(output).toContain('mahasamut_active_rooms{phase="lobby"} 2\n');
    expect(output).toContain('mahasamut_active_rooms{phase="playing"} 1\n');
    expect(output).toContain('mahasamut_active_rooms{phase="finished"} 0\n');

    expect(output).toContain(
      '# HELP mahasamut_connected_players Currently connected Socket.IO players\n',
    );
    expect(output).toContain('mahasamut_connected_players 5\n');

    expect(output).toContain('mahasamut_process_rss_bytes 42000000\n');
    expect(output).toContain('mahasamut_process_uptime_seconds 120\n');

    expect(output).toContain('# TYPE mahasamut_multi_room_players histogram\n');
    expect(output).toContain('mahasamut_multi_room_players_bucket{le="1"} 0\n');
    expect(output).toContain('mahasamut_multi_room_players_bucket{le="2"} 0\n');
    expect(output).toContain('mahasamut_multi_room_players_bucket{le="3"} 1\n');
    expect(output).toContain('mahasamut_multi_room_players_bucket{le="+Inf"} 1\n');
    expect(output).toContain('mahasamut_multi_room_players_sum 3\n');
    expect(output).toContain('mahasamut_multi_room_players_count 1\n');

    expect(output).toContain('# TYPE mahasamut_page_views_total counter\n');
    expect(output).toContain('mahasamut_page_views_total{device="desktop",route="/"} 1\n');

    expect(output.endsWith('\n')).toBe(true);

    store.close();
  });
});
