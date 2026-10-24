/// <reference types="node" />
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyDecision,
  getCurrentSoundInfo,
  publishAll,
  publishTake,
  readReview,
  writeReview,
} from './review-state';
import type { VowelReview } from './review-state';
import type { Manifest } from './takes';

describe('tools/vowels/review-state', () => {
  let tempDir: URL;
  let publicDir: URL;
  let takesDir: URL;
  let reviewFile: URL;

  beforeEach(() => {
    const root = `${tmpdir()}/vowels-review-test-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    mkdirSync(`${root}public/`, { recursive: true });
    mkdirSync(`${root}takes/`, { recursive: true });
    tempDir = pathToFileURL(root);
    publicDir = new URL('public/', tempDir);
    takesDir = new URL('takes/', tempDir);
    reviewFile = new URL('review.json', tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads and writes review.json', () => {
    expect(readReview(reviewFile)).toEqual({});
    const review: VowelReview = {
      a: { decision: 'take', take: 1, md5: 'abc', note: 'test', decidedAt: '2026-10-24' },
    };
    writeReview(reviewFile, review);
    expect(readReview(reviewFile)).toEqual(review);
  });

  it('gets current sound info from publicDir', () => {
    expect(getCurrentSoundInfo(publicDir, 'a')).toEqual({ exists: false });
    writeFileSync(new URL('a.mp3', publicDir), Buffer.from('audio-data'));
    const info = getCurrentSoundInfo(publicDir, 'a');
    expect(info.exists).toBe(true);
    expect(typeof info.md5).toBe('string');
  });

  it('applies a take decision', () => {
    const manifest: Manifest = {
      a: [{ n: 1, file: 'a-1.mp3', text: 'สระ อะ', voice: 'v', md5: 'take-md5', recordedAt: '' }],
    };
    const review = applyDecision({}, manifest, publicDir, 'a', {
      decision: 'take',
      take: 1,
      note: 'clear',
    });
    expect(review.a.decision).toBe('take');
    expect(review.a.take).toBe(1);
    expect(review.a.md5).toBe('take-md5');
    expect(review.a.note).toBe('clear');
  });

  it('applies a current decision when file exists in publicDir', () => {
    writeFileSync(new URL('a.mp3', publicDir), Buffer.from('published-sound'));
    const review = applyDecision({}, {}, publicDir, 'a', { decision: 'current' });
    expect(review.a.decision).toBe('current');
    expect(review.a.md5).toBeDefined();
  });

  it('publishes take to publicDir', () => {
    writeFileSync(new URL('a-1.mp3', takesDir), Buffer.from('best-take-sound'));
    const res = publishTake(publicDir, takesDir, 'a', 1);
    expect(res.md5).toBeDefined();
    expect(readFileSync(new URL('a.mp3', publicDir)).toString()).toBe('best-take-sound');
  });

  it('publishes all validated takes', () => {
    writeFileSync(new URL('a-1.mp3', takesDir), Buffer.from('sound-a'));
    writeFileSync(new URL('aa-2.mp3', takesDir), Buffer.from('sound-aa'));

    const review: VowelReview = {
      a: { decision: 'take', take: 1, decidedAt: '' },
      aa: { decision: 'take', take: 2, decidedAt: '' },
      i: { decision: 'none', decidedAt: '' },
    };

    const { published, skipped, updatedReview } = publishAll(review, takesDir, publicDir);
    expect(published.sort()).toEqual(['a', 'aa']);
    expect(skipped).toContain('i');
    expect(updatedReview.a.publishedAt).toBeDefined();
    expect(readFileSync(new URL('a.mp3', publicDir)).toString()).toBe('sound-a');
    expect(readFileSync(new URL('aa.mp3', publicDir)).toString()).toBe('sound-aa');
  });
});
