import { describe, expect, it } from 'vitest';
import type { Candidate } from './candidates';
import { parseArgs, selectJobs } from './record-takes';
import type { Review } from './review-state';
import type { Manifest, Take } from './takes';

describe('parseArgs', () => {
  it('reads no argument as a plain run', () => {
    expect(parseArgs([])).toEqual({ limit: undefined, more: false });
  });

  it('reads --limit N', () => {
    expect(parseArgs(['--limit', '5'])).toEqual({ limit: 5, more: false });
  });

  it('reads --more', () => {
    expect(parseArgs(['--more'])).toEqual({ limit: undefined, more: true });
  });

  it('reads both, in either order', () => {
    expect(parseArgs(['--more', '--limit', '2'])).toEqual({ limit: 2, more: true });
    expect(parseArgs(['--limit', '2', '--more'])).toEqual({ limit: 2, more: true });
  });

  it('rejects an unknown argument, naming the accepted ones', () => {
    for (const args of [['--lmit', '3'], ['--limit', '3', '--fast'], ['3'], ['--More']]) {
      expect(() => parseArgs(args), args.join(' ')).toThrow(/--limit N.*--more/);
    }
  });

  it('rejects a --limit without a whole number of 1 or more', () => {
    for (const args of [
      ['--limit'],
      ['--limit', '0'],
      ['--limit', '2.5'],
      ['--limit', 'x'],
      ['--limit', '--more'],
    ]) {
      expect(() => parseArgs(args), args.join(' ')).toThrow(/--limit needs a whole number/);
    }
  });

  it('rejects an argument given twice', () => {
    expect(() => parseArgs(['--more', '--more'])).toThrow(/twice/);
    expect(() => parseArgs(['--limit', '1', '--limit', '2'])).toThrow(/twice/);
  });
});

describe('selectJobs', () => {
  const candidate = (text: string, id: string, level: 1 | 2 = 1) =>
    ({ text, id, level }) as Candidate;
  const take = (id: string, n: number): Take => ({
    n,
    file: `${id}-${n}.mp3`,
    text: id,
    voice: 'v',
    md5: `${id}${n}`,
    recordedAt: '',
  });
  const threeTakes = (id: string) => [take(id, 1), take(id, 2), take(id, 3)];
  const entry = (decision: 'none' | 'remove' | 'take') =>
    ({
      decision,
      ...(decision === 'take' ? { take: 1 } : {}),
      note: '',
      decidedAt: '',
    }) as Review[string];

  const candidates = [
    candidate('ก', 'a'),
    candidate('ข', 'b'),
    candidate('ค', 'c'),
    candidate('ง', 'd'),
    candidate('จ', 'e', 2),
  ];
  const manifest: Manifest = {
    a: threeTakes('a'),
    b: threeTakes('b'),
    c: threeTakes('c'),
    d: threeTakes('d'),
    e: threeTakes('e'),
  };

  it('by default, asks three takes of every level 1 word that has none', () => {
    const jobs = selectJobs(candidates, {}, {}, { more: false });
    expect(jobs.map(({ id, n }) => `${id}${n}`)).toEqual([
      'a1',
      'a2',
      'a3',
      'b1',
      'b2',
      'b3',
      'c1',
      'c2',
      'c3',
      'd1',
      'd2',
      'd3',
    ]);
  });

  it('by default, asks nothing of a word that has its three takes, whatever its decision', () => {
    const review: Review = { ก: entry('none') };
    expect(selectJobs(candidates, manifest, review, { more: false })).toEqual([]);
  });

  it('by default, only the first N level 1 words with --limit', () => {
    const jobs = selectJobs(candidates, {}, {}, { limit: 2, more: false });
    expect(new Set(jobs.map(({ id }) => id))).toEqual(new Set(['a', 'b']));
  });

  describe('with --more', () => {
    it('asks takes 4 to 6 of a word whose decision is none', () => {
      const review: Review = { ก: entry('none') };
      expect(selectJobs(candidates, manifest, review, { more: true })).toEqual([
        { id: 'a', text: 'ก', n: 4 },
        { id: 'a', text: 'ก', n: 5 },
        { id: 'a', text: 'ก', n: 6 },
      ]);
    });

    it('asks nothing of a word that is validated, removed or not decided', () => {
      const review: Review = { ก: entry('take'), ข: entry('remove') };
      expect(selectJobs(candidates, manifest, review, { more: true })).toEqual([]);
    });

    it('numbers the new takes after the highest one, and adds three more each time', () => {
      const review: Review = { ก: entry('none') };
      const later: Manifest = {
        ...manifest,
        a: [...threeTakes('a'), take('a', 4), take('a', 5), take('a', 6)],
      };
      expect(selectJobs(candidates, later, review, { more: true }).map(({ n }) => n)).toEqual([
        7, 8, 9,
      ]);
    });

    it('ignores a none that belongs to no level 1 word', () => {
      const review: Review = { จ: entry('none'), ผี: entry('none') };
      expect(selectJobs(candidates, manifest, review, { more: true })).toEqual([]);
    });

    it('keeps to the first N words that want more with --limit', () => {
      const review: Review = { ก: entry('none'), ข: entry('none'), ค: entry('none') };
      const jobs = selectJobs(candidates, manifest, review, { limit: 2, more: true });
      expect(new Set(jobs.map(({ id }) => id))).toEqual(new Set(['a', 'b']));
      expect(jobs).toHaveLength(6);
    });
  });
});
