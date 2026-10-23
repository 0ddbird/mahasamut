import { describe, expect, it, vi } from 'vitest';
import { GAME, GAME_NAMES } from '../games/shared/games';
import { REPORT_TUNNEL } from '../monitoring/sentry';
import {
  MAX_COMMENT_LENGTH,
  REASON_LABELS,
  REASONS,
  reportEnvelope,
  reportEvent,
  sendReport,
} from './report';
import type { ReportInput } from './report';

// A DSN that points nowhere: nothing in these tests can reach a real project.
const DSN = 'https://public@o1.ingest.de.sentry.io/42';
const NOW = new Date('2026-10-23T10:00:00.000Z');
const EVENT_ID = '0123456789abcdef0123456789abcdef';

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  question: {
    game: GAME.Syllable,
    questionId: 'น้ำ',
    text: 'น้ำ',
    expected: 'High',
    sound: '/sounds/nam.mp3',
  },
  reasons: ['sound', 'expected'],
  comment: '',
  where: 'recap',
  mode: 'solo',
  ...overrides,
});

describe('REASONS', () => {
  it("offers each game's reasons", () => {
    expect(REASONS).toEqual({
      [GAME.Vowel]: ['sound', 'expected', 'other'],
      [GAME.ConsonantClass]: ['expected', 'other'],
      [GAME.Syllable]: ['sound', 'expected', 'other'],
    });
    expect(REASON_LABELS).toEqual({
      [GAME.Vowel]: {
        sound: 'The sound is wrong',
        expected: 'The expected answer is wrong',
        other: 'Other',
      },
      [GAME.ConsonantClass]: {
        expected: 'The expected class is wrong',
        other: 'Other',
      },
      [GAME.Syllable]: {
        sound: 'The sound is wrong',
        expected: 'The expected tone is wrong',
        other: 'Other',
      },
    });
  });
});

describe('reportEvent', () => {
  it('groups by question, all reasons together', () => {
    const first = reportEvent(input({ reasons: ['sound'] }), NOW, EVENT_ID);
    const second = reportEvent(input({ reasons: ['expected', 'other'] }), NOW, EVENT_ID);

    expect(first.fingerprint).toEqual(['report', 'syllable', 'น้ำ']);
    expect(second.fingerprint).toEqual(['report', 'syllable', 'น้ำ']);
  });

  it('titles the issue and tags each reason', () => {
    const event = reportEvent(input(), NOW, EVENT_ID);

    expect(event.message).toBe(`Report: ${GAME_NAMES[GAME.Syllable]} · น้ำ`);
    expect(event.message).toBe('Report: Find the tone · น้ำ');
    expect(event.level).toBe('info');
    expect(event.platform).toBe('javascript');
    expect(event.tags).toMatchObject({
      kind: 'report',
      game: 'syllable',
      question_id: 'น้ำ',
      where: 'recap',
      mode: 'solo',
      'reason.sound': 'yes',
      'reason.expected': 'yes',
    });
    expect(event.tags).not.toHaveProperty('reason.other');
  });

  it('carries the question and the release in the details', () => {
    const event = reportEvent(input({ comment: 'Sounds like nam' }), NOW, EVENT_ID, 'abc123');

    expect(event.event_id).toBe(EVENT_ID);
    expect(event.timestamp).toBe(NOW.getTime() / 1000);
    expect(event.release).toBe('abc123');
    expect(event.extra).toEqual({
      text: 'น้ำ',
      expected: 'High',
      sound: '/sounds/nam.mp3',
      comment: 'Sounds like nam',
    });
    expect(event.environment).toBe('production');
  });

  it('leaves out what is empty', () => {
    const event = reportEvent(
      input({ question: { ...input().question, sound: null } }),
      NOW,
      EVENT_ID,
    );

    expect(event.extra).not.toHaveProperty('sound');
    expect(event.extra).not.toHaveProperty('comment');
    expect(event).not.toHaveProperty('release');
  });

  it("keeps the player's answer out", () => {
    // A recap line holds the answer; the report is built from it and must not copy it.
    const line = { ...input().question, given: 'Low', result: 'wrong' };
    const json = JSON.stringify(reportEvent(input({ question: line }), NOW, EVENT_ID));

    expect(json).not.toContain('"given"');
    expect(json).not.toContain('"result"');
    expect(json).not.toContain('Low');
  });

  it('cuts the comment', () => {
    const event = reportEvent(input({ comment: 'x'.repeat(1200) }), NOW, EVENT_ID);

    expect(MAX_COMMENT_LENGTH).toBe(1000);
    expect((event.extra as { comment: string }).comment).toHaveLength(1000);
  });
});

describe('reportEnvelope', () => {
  it('writes a Sentry envelope', () => {
    const event = reportEvent(input(), NOW, EVENT_ID);
    const lines = reportEnvelope(event, DSN, NOW).split('\n');

    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0])).toEqual({
      event_id: EVENT_ID,
      sent_at: NOW.toISOString(),
      dsn: DSN,
    });
    expect(JSON.parse(lines[1])).toEqual({ type: 'event' });
    expect(JSON.parse(lines[2])).toEqual(event);
  });
});

describe('sendReport', () => {
  const deps = (response: Response | Error) => {
    const fetch = vi.fn(() =>
      response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
    );
    const log = vi.fn();
    return {
      fetch,
      log,
      deps: { dsn: DSN, fetch, log, now: () => NOW, eventId: () => EVENT_ID },
    };
  };

  it('logs and does not send without a DSN', async () => {
    const { fetch, log } = deps(new Response(null, { status: 200 }));

    const outcome = await sendReport(input(), {
      fetch,
      log,
      now: () => NOW,
      eventId: () => EVENT_ID,
    });

    expect(outcome).toBe('sent');
    expect(fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(reportEvent(input(), NOW, EVENT_ID));
  });

  it('posts the envelope to the tunnel', async () => {
    const { fetch, log, deps: all } = deps(new Response(null, { status: 200 }));

    await sendReport(input(), all);

    expect(log).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(REPORT_TUNNEL);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain;charset=UTF-8' });
    expect(init.body).toBe(reportEnvelope(reportEvent(input(), NOW, EVENT_ID), DSN, NOW));
  });

  it('says sent, limited or failed', async () => {
    expect(await sendReport(input(), deps(new Response(null, { status: 200 })).deps)).toBe('sent');
    expect(await sendReport(input(), deps(new Response(null, { status: 429 })).deps)).toBe(
      'limited',
    );
    expect(await sendReport(input(), deps(new Response(null, { status: 500 })).deps)).toBe(
      'failed',
    );
    expect(await sendReport(input(), deps(new TypeError('offline')).deps)).toBe('failed');
  });
});
