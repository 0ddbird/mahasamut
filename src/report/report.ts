/**
 * A report about a question: the event that lands in Sentry, and the sending of
 * it. The site does not go through the SDK for this. It writes the Sentry
 * envelope itself and posts it to our own tunnel, so that it learns whether the
 * report was received, which the SDK does not tell: a player must never believe
 * a report was sent when it was not.
 */
import { GAME, GAME_NAMES } from '../games/shared/games';
import type { GameId } from '../games/shared/games';
import type { RecapEntry } from '../games/shared/recap';
import { REPORT_TUNNEL, siteDsn } from '../monitoring/sentry';

export type ReportReason = 'sound' | 'expected' | 'other';
export type ReportWhere = 'question' | 'recap';
export type ReportMode = 'solo' | 'multi';

/** What a report is about: taken from the recap line of the question. */
export type ReportedQuestion = Pick<
  RecapEntry,
  'game' | 'questionId' | 'text' | 'expected' | 'sound'
>;

export interface ReportInput {
  question: ReportedQuestion;
  reasons: readonly ReportReason[];
  comment: string;
  where: ReportWhere;
  mode: ReportMode;
}

/** `limited` is the tunnel's budget running out: the player can try again later. */
export type ReportOutcome = 'sent' | 'failed' | 'limited';

/** The reasons each game offers, in the order the form lists them. */
export const REASONS = {
  [GAME.Vowel]: ['sound', 'expected', 'other'],
  [GAME.ConsonantClass]: ['expected', 'other'],
  [GAME.Syllable]: ['sound', 'expected', 'other'],
} as const satisfies Record<GameId, readonly ReportReason[]>;

/**
 * What the form says for each reason: the answer a game expects is not the same
 * kind of thing in each. A game has a label for the reasons it offers and no other.
 */
export const REASON_LABELS: { [G in GameId]: Record<(typeof REASONS)[G][number], string> } = {
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
};

export const MAX_COMMENT_LENGTH = 1000;

/**
 * The Sentry event of a report. One issue per question, whatever the reasons:
 * the fingerprint names the game and the question, nothing else. The player's
 * answer is left out on purpose, it does not help to fix the question.
 */
export function reportEvent(
  input: ReportInput,
  now: Date,
  eventId: string,
  release?: string,
): Record<string, unknown> {
  const { question, reasons, comment, where, mode } = input;
  const reasonTags = Object.fromEntries(reasons.map((reason) => [`reason.${reason}`, 'yes']));
  const text = comment.slice(0, MAX_COMMENT_LENGTH);

  return {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: 'javascript',
    level: 'info',
    message: `Report: ${GAME_NAMES[question.game]} · ${question.text}`,
    fingerprint: ['report', question.game, question.questionId],
    tags: {
      // Tells a report from a JavaScript error in the same project.
      kind: 'report',
      game: question.game,
      question_id: question.questionId,
      where,
      mode,
      ...reasonTags,
    },
    extra: {
      text: question.text,
      expected: question.expected,
      ...(question.sound !== null && { sound: question.sound }),
      ...(text && { comment: text }),
    },
    environment: 'production',
    ...(release && { release }),
  };
}

/**
 * The event in Sentry's envelope format: a header naming the DSN (the tunnel
 * checks it), the item's header, then the event, one JSON document per line.
 */
export function reportEnvelope(event: Record<string, unknown>, dsn: string, now: Date): string {
  return [
    JSON.stringify({ event_id: event.event_id, sent_at: now.toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');
}

interface SendDeps {
  /** The DSN to report to. Defaults to the build's. */
  dsn?: string;
  fetch?: typeof fetch;
  /** Where the event goes when there is no DSN. */
  log?: (data: unknown) => void;
  now?: () => Date;
  eventId?: () => string;
  release?: string;
}

/**
 * Sends a report through the tunnel and says what became of it. Without a DSN
 * (development, tests) nothing is sent: the event is logged, and counts as sent
 * so that the form can be tried out. A network error is `failed`, never thrown.
 */
export async function sendReport(input: ReportInput, deps: SendDeps = {}): Promise<ReportOutcome> {
  const {
    dsn = siteDsn(),
    fetch: post = (...args) => fetch(...args),
    log = (data) => console.info('Report (not sent, no DSN):', data),
    now = () => new Date(),
    eventId = () => crypto.randomUUID().replaceAll('-', ''),
    release = import.meta.env.VITE_SENTRY_RELEASE || undefined,
  } = deps;

  const sentAt = now();
  const event = reportEvent(input, sentAt, eventId(), release);
  if (!dsn) {
    log(event);
    return 'sent';
  }

  try {
    const response = await post(REPORT_TUNNEL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: reportEnvelope(event, dsn, sentAt),
    });
    if (response.ok) return 'sent';
    return response.status === 429 ? 'limited' : 'failed';
  } catch {
    return 'failed';
  }
}
