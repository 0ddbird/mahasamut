/// <reference types="node" />
import { describe, expect, it } from 'vitest';
// The server cannot import the site, nor the site the server: this test is where
// the two meet, so that changing how one writes an envelope cannot silently break
// how the other reads it.
import { parseDsn, readEnvelope } from '../../server/report/envelope.ts';
import { GAME } from '../games/shared/games';
import { reportEnvelope, reportEvent } from './report';
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
  comment: 'Line one\nline two, with "quotes" and น้ำ',
  where: 'recap',
  mode: 'solo',
  ...overrides,
});

describe('the envelope of a report, between the site and the tunnel', () => {
  it('is read by the tunnel as a report for the same DSN', () => {
    const body = reportEnvelope(reportEvent(input(), NOW, EVENT_ID, 'abc1234'), DSN, NOW);

    expect(readEnvelope(body)).toEqual({ dsn: parseDsn(DSN), kind: 'report' });
  });

  it('is read as a report whatever the game, the reasons and the comment', () => {
    for (const game of Object.values(GAME)) {
      for (const comment of ['', '   ', 'x'.repeat(5000)]) {
        const question = { ...input().question, game };
        const body = reportEnvelope(
          reportEvent(input({ question, reasons: [], comment }), NOW, EVENT_ID),
          DSN,
          NOW,
        );

        expect(readEnvelope(body)?.kind).toBe('report');
      }
    }
  });
});

describe('the envelope of a JavaScript error, as the SDK writes it', () => {
  // The shape `@sentry/browser` sends: the header names the SDK, the item is a plain `event`.
  const sdkEnvelope = (tags: Record<string, string> | undefined) =>
    [
      JSON.stringify({
        event_id: EVENT_ID,
        sent_at: '2026-10-23T10:00:00.000Z',
        sdk: { name: 'sentry.javascript.react', version: '11.8.0' },
        dsn: DSN,
      }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({
        event_id: EVENT_ID,
        level: 'error',
        platform: 'javascript',
        exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] },
        ...(tags && { tags }),
      }),
    ].join('\n');

  it('is read by the tunnel as an error for the same DSN', () => {
    expect(readEnvelope(sdkEnvelope({ kind: 'error' }))).toEqual({
      dsn: parseDsn(DSN),
      kind: 'error',
    });
  });

  it('is read as an error even when the event carries no kind', () => {
    expect(readEnvelope(sdkEnvelope(undefined))?.kind).toBe('error');
  });
});
