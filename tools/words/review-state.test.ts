import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Candidate } from './candidates';
import {
  applyDecision,
  firstPendingPage,
  orphans,
  readReview,
  status,
  takeMatches,
  uniqueTakes,
  writeReview,
} from './review-state';
import type { Review, ReviewEntry, StoredDecision } from './review-state';
import type { Manifest, Take } from './takes';

const candidate = (text: string, id: string, level: 1 | 2 = 1) =>
  ({ text, id, level }) as Candidate;

const take = (n: number, md5 = `md5-${n}`): Take => ({
  n,
  file: `a-${n}.mp3`,
  text: 'กา',
  voice: 'v',
  md5,
  recordedAt: '',
});

const entry = (decision: StoredDecision = { decision: 'none' }, note = ''): ReviewEntry => ({
  ...decision,
  note,
  decidedAt: '2026-10-21T10:00:00.000Z',
});

const now = new Date('2026-10-22T08:30:00.000Z');

describe('uniqueTakes', () => {
  it('lists identical takes once, keeping the lowest number', () => {
    const takes = [take(3, 'same'), take(1, 'same'), take(2, 'other')];
    expect(uniqueTakes(takes).map(({ n }) => n)).toEqual([1, 2]);
  });

  it('keeps takes that differ, in number order', () => {
    expect(uniqueTakes([take(2), take(1), take(3)]).map(({ n }) => n)).toEqual([1, 2, 3]);
  });

  it('answers an empty list for no takes', () => {
    expect(uniqueTakes([])).toEqual([]);
  });
});

describe('takeMatches', () => {
  const heard = entry({ decision: 'take', take: 2, md5: 'md5-2' });

  it('is true while the take has the recording that was heard', () => {
    expect(takeMatches(heard, [take(1), take(2)])).toBe(true);
  });

  it('is false when the take was recorded again', () => {
    expect(takeMatches(heard, [take(1), take(2, 'another')])).toBe(false);
  });

  it('is false when the take is gone', () => {
    expect(takeMatches(heard, [take(1)])).toBe(false);
    expect(takeMatches(heard, [])).toBe(false);
  });

  it('is false for a take decision without an md5, which cannot be confirmed', () => {
    expect(takeMatches(entry({ decision: 'take', take: 2 }), [take(2)])).toBe(false);
  });

  it('is true for none and remove, which depend on no recording', () => {
    expect(takeMatches(entry({ decision: 'none' }), [])).toBe(true);
    expect(takeMatches(entry({ decision: 'remove' }), [])).toBe(true);
  });
});

describe('status', () => {
  it('is todo without a decision', () => {
    expect(status(undefined)).toBe('todo');
  });

  it('tells the three decisions apart', () => {
    expect(status(entry({ decision: 'take', take: 2 }))).toBe('validated');
    expect(status(entry({ decision: 'none' }))).toBe('none');
    expect(status(entry({ decision: 'remove' }))).toBe('removed');
  });
});

describe('orphans', () => {
  const candidates = [candidate('กา', 'a'), candidate('ขา', 'b')];

  it('lists the entries of words that are no candidate any more', () => {
    const review: Review = { กา: entry(), ผี: entry(), หมี: entry() };
    expect(orphans(review, candidates)).toEqual(['ผี', 'หมี']);
  });

  it('lists nothing when every entry has its candidate', () => {
    expect(orphans({ กา: entry() }, candidates)).toEqual([]);
  });
});

describe('firstPendingPage', () => {
  const candidates = ['ก', 'ข', 'ค', 'ง', 'จ'].map((text) => candidate(text, text));

  it('lands on page 0 when the first word is todo', () => {
    expect(firstPendingPage(candidates, {}, 2)).toBe(0);
  });

  it('lands on the page of the first todo word', () => {
    const review: Review = { ก: entry(), ข: entry(), ค: entry(), จ: entry() };
    // ง is the fourth word, index 3: page 1 of pages of two.
    expect(firstPendingPage(candidates, review, 2)).toBe(1);
  });

  it('skips decided words later than the first todo one', () => {
    const review: Review = { ก: entry(), ข: entry(), จ: entry() };
    expect(firstPendingPage(candidates, review, 2)).toBe(1);
  });

  it('goes back to the first page once everything is decided', () => {
    const review = Object.fromEntries(candidates.map(({ text }) => [text, entry()]));
    expect(firstPendingPage(candidates, review, 2)).toBe(0);
  });

  it('is 0 without candidates', () => {
    expect(firstPendingPage([], {}, 50)).toBe(0);
  });
});

describe('applyDecision', () => {
  const candidates = [candidate('กา', 'a'), candidate('ขา', 'b'), candidate('คา', 'c', 2)];
  const manifest: Manifest = { a: [take(1), take(2)], b: [take(1)] };

  it('records a take with its date, and an empty note', () => {
    const review = applyDecision(
      {},
      candidates,
      manifest,
      'กา',
      { decision: 'take', take: 2 },
      now,
    );
    expect(review).toEqual({
      กา: {
        decision: 'take',
        take: 2,
        md5: 'md5-2',
        note: '',
        decidedAt: '2026-10-22T08:30:00.000Z',
      },
    });
  });

  it('stores the md5 of the take heard, whatever the other takes are', () => {
    const changed: Manifest = { a: [take(1, 'first'), take(2, 'second')] };
    const review = applyDecision({}, candidates, changed, 'กา', { decision: 'take', take: 1 }, now);
    expect(review.กา).toMatchObject({ take: 1, md5: 'first' });
  });

  it('keeps the md5 heard when a note is saved on the same take, even if the audio changed since', () => {
    const heard = applyDecision({}, candidates, manifest, 'กา', { decision: 'take', take: 2 }, now);
    const rerecorded: Manifest = { a: [take(1), take(2, 'new audio')] };

    const sameTake = applyDecision(
      heard,
      candidates,
      rerecorded,
      'กา',
      { decision: 'take', take: 2, note: 'ok' },
      now,
    );
    expect(sameTake.กา).toMatchObject({ take: 2, md5: 'md5-2', note: 'ok' });

    // Choosing the take again after the re-recording is a new listening.
    const otherTake = applyDecision(
      heard,
      candidates,
      rerecorded,
      'กา',
      { decision: 'take', take: 1 },
      now,
    );
    expect(otherTake.กา).toMatchObject({ take: 1, md5: 'md5-1' });
  });

  it('fills the md5 of an entry that has none when it is decided again', () => {
    const old = { กา: { decision: 'take', take: 2, note: '', decidedAt: '' } } as Review;
    const review = applyDecision(
      old,
      candidates,
      manifest,
      'กา',
      { decision: 'take', take: 2 },
      now,
    );
    expect(review.กา).toMatchObject({ take: 2, md5: 'md5-2' });
  });

  it('records none and remove without a take number', () => {
    let review = applyDecision({}, candidates, manifest, 'กา', { decision: 'none' }, now);
    review = applyDecision(review, candidates, manifest, 'ขา', { decision: 'remove' }, now);
    expect(review.กา).toEqual({
      decision: 'none',
      note: '',
      decidedAt: '2026-10-22T08:30:00.000Z',
    });
    expect(review.ขา).toEqual({
      decision: 'remove',
      note: '',
      decidedAt: '2026-10-22T08:30:00.000Z',
    });
  });

  it('keeps no take number when a take is replaced by none', () => {
    const before: Review = { กา: entry({ decision: 'take', take: 1 }) };
    const after = applyDecision(before, candidates, manifest, 'กา', { decision: 'none' }, now);
    expect(after.กา).not.toHaveProperty('take');
    expect(after.กา).not.toHaveProperty('md5');
  });

  it('replaces the old decision and keeps its note when no new note is given', () => {
    const before: Review = { กา: entry({ decision: 'none' }, 'voice says kaa') };
    const after = applyDecision(
      before,
      candidates,
      manifest,
      'กา',
      { decision: 'take', take: 1 },
      now,
    );
    expect(after.กา).toEqual({
      decision: 'take',
      take: 1,
      md5: 'md5-1',
      note: 'voice says kaa',
      decidedAt: '2026-10-22T08:30:00.000Z',
    });
  });

  it('replaces the note when a new one is given, even an empty one', () => {
    const before: Review = { กา: entry(undefined, 'old') };
    const withNote = applyDecision(
      before,
      candidates,
      manifest,
      'กา',
      { decision: 'remove', note: 'new' },
      now,
    );
    expect(withNote.กา.note).toBe('new');
    const cleared = applyDecision(
      before,
      candidates,
      manifest,
      'กา',
      { decision: 'remove', note: '' },
      now,
    );
    expect(cleared.กา.note).toBe('');
  });

  it('does not change the review it is given, and keeps the other entries, orphans included', () => {
    const before: Review = { ผี: entry(undefined, 'gone'), ขา: entry() };
    const frozen = structuredClone(before);
    const after = applyDecision(before, candidates, manifest, 'กา', { decision: 'none' }, now);
    expect(before).toEqual(frozen);
    expect(after.ผี).toEqual(before.ผี);
    expect(after.ขา).toEqual(before.ขา);
  });

  it('throws for a word that is no candidate', () => {
    expect(() => applyDecision({}, candidates, manifest, 'ผี', { decision: 'none' }, now)).toThrow(
      /ผี/,
    );
  });

  it('throws for a level 2 candidate', () => {
    expect(() => applyDecision({}, candidates, manifest, 'คา', { decision: 'none' }, now)).toThrow(
      /คา/,
    );
  });

  it('throws for a take that is not in the manifest', () => {
    expect(() =>
      applyDecision({}, candidates, manifest, 'กา', { decision: 'take', take: 3 }, now),
    ).toThrow(/take 3/);
    expect(() =>
      applyDecision({}, candidates, {}, 'กา', { decision: 'take', take: 1 }, now),
    ).toThrow(/take 1/);
  });
});

describe('readReview and writeReview', () => {
  let folder: string;
  let file: URL;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'review-'));
    file = pathToFileURL(join(folder, 'review.json'));
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('reads an empty review when the file does not exist yet', () => {
    expect(readReview(file)).toEqual({});
  });

  it('reads back what it wrote', () => {
    const review: Review = {
      กา: entry({ decision: 'take', take: 2 }, 'ok'),
      ขา: entry({ decision: 'remove' }),
    };
    writeReview(file, review);
    expect(readReview(file)).toEqual(review);
  });

  it('reads an entry written without an md5 and does not crash on it', () => {
    writeFileSync(
      file,
      '{\n  "กา": {"decision":"take","take":2,"note":"","decidedAt":"2026-10-21T10:00:00.000Z"}\n}\n',
    );
    const review = readReview(file);
    expect(status(review.กา)).toBe('validated');
    expect(takeMatches(review.กา!, [take(2)])).toBe(false);
  });

  it('keeps an orphan entry through a write', () => {
    const review: Review = { ผี: entry(undefined, 'no candidate') };
    writeReview(file, review);
    expect(readReview(file)).toEqual(review);
  });

  it('writes one word per line, ending with a newline', () => {
    writeReview(file, { กา: entry(), ขา: entry() });
    const lines = readFileSync(file, 'utf8').split('\n');
    expect(lines).toHaveLength(5);
    expect(lines.at(-1)).toBe('');
  });

  it('writes an empty review as an empty object', () => {
    writeReview(file, {});
    expect(readReview(file)).toEqual({});
  });
});
