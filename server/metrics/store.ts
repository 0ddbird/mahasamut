import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { StatementSync } from 'node:sqlite';
import type { GameId } from '../../src/games/shared/games';
import { gameMetricLabel } from '../../src/site/events';
import type { ClientEvent } from '../../src/site/events';

export const HISTOGRAM_BUCKETS = [1, 2, 3, 5, 10, 20, 30] as const;

export type ContactOutcome = 'sent' | 'fake_ok' | 'rate_limited' | 'invalid' | 'error';

export interface RoomCounts {
  lobby: number;
  playing: number;
  finished: number;
}

export interface MetricGauges {
  activeRooms: RoomCounts;
  connectedPlayers: number;
  processRssBytes?: number;
  processUptimeSeconds?: number;
}

const METRIC_HELP: Record<string, string> = {
  mahasamut_active_rooms: 'Currently active multiplayer rooms',
  mahasamut_connected_players: 'Currently connected Socket.IO players',
  mahasamut_process_rss_bytes: 'Resident memory size of the server in bytes',
  mahasamut_process_uptime_seconds: 'Process uptime in seconds',
  mahasamut_page_views_total: 'Anonymous page views',
  mahasamut_solo_games_started_total: 'Solo games started',
  mahasamut_solo_games_finished_total: 'Solo games finished',
  mahasamut_audio_listen_total: 'Audio listen clicks',
  mahasamut_lobby_link_copied_total: 'Multiplayer lobby link copied',
  mahasamut_support_clicks_total: 'Ko-fi support link clicks',
  mahasamut_rooms_created_total: 'Multiplayer rooms created',
  mahasamut_multi_games_started_total: 'Multiplayer games started',
  mahasamut_multi_games_finished_total: 'Multiplayer games finished',
  mahasamut_multi_players_started_total: 'Active players across all multiplayer games started',
  mahasamut_multi_room_players: 'Active players per multiplayer game started',
  mahasamut_multi_back_to_lobby_total: 'Back to lobby clicks',
  mahasamut_contact_requests_total: 'Contact form requests',
};

function formatIsoDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export class MetricsStore {
  private readonly db: DatabaseSync;
  private readonly incCounterStmt: StatementSync;
  private readonly incDailyStmt: StatementSync;
  private readonly selectAllCountersStmt: StatementSync;
  private readonly selectAllDailyStmt: StatementSync;
  private readonly selectDailyByDayStmt: StatementSync;

  constructor(location?: string | DatabaseSync) {
    if (location instanceof DatabaseSync) {
      this.db = location;
    } else {
      const dbPath =
        location ??
        process.env.STATS_DB_PATH ??
        (process.env.STATE_DIRECTORY ? `${process.env.STATE_DIRECTORY}/stats.db` : ':memory:');

      if (dbPath !== ':memory:') {
        try {
          mkdirSync(dirname(dbPath), { recursive: true });
        } catch {
          // directory might already exist
        }
      }
      this.db = new DatabaseSync(dbPath);
    }

    this.initSchema();

    this.incCounterStmt = this.db.prepare(`
      INSERT INTO counters (name, labels, value)
      VALUES (?, ?, ?)
      ON CONFLICT (name, labels) DO UPDATE SET value = value + excluded.value
    `);

    this.incDailyStmt = this.db.prepare(`
      INSERT INTO daily_counters (day, name, labels, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (day, name, labels) DO UPDATE SET value = value + excluded.value
    `);

    this.selectAllCountersStmt = this.db.prepare(`
      SELECT name, labels, value FROM counters ORDER BY name, labels
    `);

    this.selectAllDailyStmt = this.db.prepare(`
      SELECT day, name, labels, value FROM daily_counters ORDER BY day, name, labels
    `);

    this.selectDailyByDayStmt = this.db.prepare(`
      SELECT day, name, labels, value FROM daily_counters WHERE day = ? ORDER BY name, labels
    `);
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS counters (
        name TEXT NOT NULL,
        labels TEXT NOT NULL,
        value INTEGER NOT NULL,
        PRIMARY KEY (name, labels)
      );

      CREATE TABLE IF NOT EXISTS daily_counters (
        day TEXT NOT NULL,
        name TEXT NOT NULL,
        labels TEXT NOT NULL,
        value INTEGER NOT NULL,
        PRIMARY KEY (day, name, labels)
      );
    `);
  }

  private increment(name: string, labels: string, amount: number, now: number): void {
    const day = formatIsoDay(now);
    this.incCounterStmt.run(name, labels, amount);
    this.incDailyStmt.run(day, name, labels, amount);
  }

  recordClientEvent(event: ClientEvent, now: number = Date.now()): void {
    switch (event.type) {
      case 'page_view':
        this.increment(
          'mahasamut_page_views_total',
          `device="${event.device}",route="${event.route}"`,
          1,
          now,
        );
        break;
      case 'solo_game_started':
        this.increment(
          'mahasamut_solo_games_started_total',
          `game="${gameMetricLabel(event.game)}",timed="${event.timed}"`,
          1,
          now,
        );
        break;
      case 'solo_game_finished':
        this.increment(
          'mahasamut_solo_games_finished_total',
          `game="${gameMetricLabel(event.game)}",timed="${event.timed}"`,
          1,
          now,
        );
        break;
      case 'audio_listen':
        this.increment(
          'mahasamut_audio_listen_total',
          `context="${event.context}"`,
          1,
          now,
        );
        break;
      case 'lobby_link_copied':
        this.increment('mahasamut_lobby_link_copied_total', '', 1, now);
        break;
      case 'support_click':
        this.increment('mahasamut_support_clicks_total', '', 1, now);
        break;
    }
  }

  recordContactOutcome(outcome: ContactOutcome, now: number = Date.now()): void {
    this.increment('mahasamut_contact_requests_total', `outcome="${outcome}"`, 1, now);
  }

  recordRoomCreated(hasPassword: boolean, now: number = Date.now()): void {
    this.increment('mahasamut_rooms_created_total', `has_password="${hasPassword}"`, 1, now);
  }

  recordMultiGameStarted(game: GameId, playerCount: number, now: number = Date.now()): void {
    this.increment('mahasamut_multi_games_started_total', `game="${gameMetricLabel(game)}"`, 1, now);
    this.increment(
      'mahasamut_multi_players_started_total',
      `game="${gameMetricLabel(game)}"`,
      playerCount,
      now,
    );

    for (const bucket of HISTOGRAM_BUCKETS) {
      if (playerCount <= bucket) {
        this.increment('mahasamut_multi_room_players_bucket', `le="${bucket}"`, 1, now);
      }
    }
    this.increment('mahasamut_multi_room_players_bucket', 'le="+Inf"', 1, now);
    this.increment('mahasamut_multi_room_players_sum', '', playerCount, now);
    this.increment('mahasamut_multi_room_players_count', '', 1, now);
  }

  recordMultiGameFinished(game: GameId, now: number = Date.now()): void {
    this.increment('mahasamut_multi_games_finished_total', `game="${gameMetricLabel(game)}"`, 1, now);
  }

  recordMultiBackToLobby(now: number = Date.now()): void {
    this.increment('mahasamut_multi_back_to_lobby_total', '', 1, now);
  }

  getCounters(): { name: string; labels: string; value: number }[] {
    return this.selectAllCountersStmt.all() as { name: string; labels: string; value: number }[];
  }

  getDailyCounters(day?: string): { day: string; name: string; labels: string; value: number }[] {
    if (day) {
      return this.selectDailyByDayStmt.all(day) as {
        day: string;
        name: string;
        labels: string;
        value: number;
      }[];
    }
    return this.selectAllDailyStmt.all() as {
      day: string;
      name: string;
      labels: string;
      value: number;
    }[];
  }

  formatPrometheus(gauges: MetricGauges): string {
    const lines: string[] = [];

    // 1. Live gauges
    lines.push(
      `# HELP mahasamut_active_rooms ${METRIC_HELP.mahasamut_active_rooms}`,
      `# TYPE mahasamut_active_rooms gauge`,
      `mahasamut_active_rooms{phase="lobby"} ${gauges.activeRooms.lobby}`,
      `mahasamut_active_rooms{phase="playing"} ${gauges.activeRooms.playing}`,
      `mahasamut_active_rooms{phase="finished"} ${gauges.activeRooms.finished}`,
    );

    lines.push(
      `# HELP mahasamut_connected_players ${METRIC_HELP.mahasamut_connected_players}`,
      `# TYPE mahasamut_connected_players gauge`,
      `mahasamut_connected_players ${gauges.connectedPlayers}`,
    );

    const rss = gauges.processRssBytes ?? process.memoryUsage().rss;
    lines.push(
      `# HELP mahasamut_process_rss_bytes ${METRIC_HELP.mahasamut_process_rss_bytes}`,
      `# TYPE mahasamut_process_rss_bytes gauge`,
      `mahasamut_process_rss_bytes ${rss}`,
    );

    const uptime = gauges.processUptimeSeconds ?? Math.floor(process.uptime());
    lines.push(
      `# HELP mahasamut_process_uptime_seconds ${METRIC_HELP.mahasamut_process_uptime_seconds}`,
      `# TYPE mahasamut_process_uptime_seconds gauge`,
      `mahasamut_process_uptime_seconds ${uptime}`,
    );

    // 2. Persisted counters & histograms
    const counters = this.getCounters();
    const grouped = new Map<string, { labels: string; value: number }[]>();

    for (const c of counters) {
      if (!grouped.has(c.name)) {
        grouped.set(c.name, []);
      }
      grouped.get(c.name)!.push({ labels: c.labels, value: c.value });
    }

    // Handle histogram family first if present
    const hasHistogram =
      grouped.has('mahasamut_multi_room_players_bucket') ||
      grouped.has('mahasamut_multi_room_players_sum') ||
      grouped.has('mahasamut_multi_room_players_count');

    if (hasHistogram) {
      lines.push(
        `# HELP mahasamut_multi_room_players ${METRIC_HELP.mahasamut_multi_room_players}`,
        `# TYPE mahasamut_multi_room_players histogram`,
      );

      const bucketMap = new Map<string, number>();
      for (const row of grouped.get('mahasamut_multi_room_players_bucket') ?? []) {
        bucketMap.set(row.labels, row.value);
      }

      for (const b of HISTOGRAM_BUCKETS) {
        const key = `le="${b}"`;
        const val = bucketMap.get(key) ?? 0;
        lines.push(`mahasamut_multi_room_players_bucket{${key}} ${val}`);
      }
      const infVal = bucketMap.get('le="+Inf"') ?? 0;
      lines.push(`mahasamut_multi_room_players_bucket{le="+Inf"} ${infVal}`);

      const sumVal = (grouped.get('mahasamut_multi_room_players_sum') ?? [])[0]?.value ?? 0;
      lines.push(`mahasamut_multi_room_players_sum ${sumVal}`);

      const countVal = (grouped.get('mahasamut_multi_room_players_count') ?? [])[0]?.value ?? 0;
      lines.push(`mahasamut_multi_room_players_count ${countVal}`);
    }

    // Other counters
    for (const [name, rows] of grouped) {
      if (
        name === 'mahasamut_multi_room_players_bucket' ||
        name === 'mahasamut_multi_room_players_sum' ||
        name === 'mahasamut_multi_room_players_count'
      ) {
        continue;
      }

      const help = METRIC_HELP[name] ?? 'Application metric';
      lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} counter`);

      for (const row of rows) {
        if (row.labels === '') {
          lines.push(`${name} ${row.value}`);
        } else {
          lines.push(`${name}{${row.labels}} ${row.value}`);
        }
      }
    }

    return lines.join('\n') + '\n';
  }

  close(): void {
    this.db.close();
  }
}
