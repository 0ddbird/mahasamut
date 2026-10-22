/// <reference types="node" />
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Candidate } from './candidates';
import { soundPlan, syncSounds } from './build-sounds';
import { wordId } from './ids';
import type { Review } from './review-state';
import type { Manifest, Take } from './takes';

const candidate = (text: string, level: 1 | 2 = 1) =>
  ({ text, id: wordId(text), level }) as Candidate;

const take = (text: string, n: number, md5: string): Take => ({
  n,
  file: `${wordId(text)}-${n}.mp3`,
  text,
  voice: 'th-TH-Chirp3-HD-Leda',
  md5,
  recordedAt: '2026-10-21T10:00:00.000Z',
});

const decidedAt = '2026-10-22T10:00:00.000Z';

describe('soundPlan', () => {
  const manifest: Manifest = {
    [wordId('กา')]: [take('กา', 1, 'a1'), take('กา', 2, 'a2')],
    [wordId('ขา')]: [take('ขา', 1, 'b1')],
    [wordId('คา')]: [take('คา', 1, 'c1')],
  };

  it('copies the take chosen for each validated word', () => {
    const review: Review = { กา: { decision: 'take', take: 2, md5: 'a2', note: '', decidedAt } };
    expect(soundPlan([candidate('กา')], review, manifest)).toEqual({
      copy: [{ text: 'กา', id: wordId('กา'), file: `${wordId('กา')}-2.mp3` }],
      skipped: [],
    });
  });

  it('gives no sound to a word still to review, without a right take, or removed', () => {
    const review: Review = {
      ขา: { decision: 'none', note: '', decidedAt },
      คา: { decision: 'remove', note: '', decidedAt },
    };
    const plan = soundPlan([candidate('กา'), candidate('ขา'), candidate('คา')], review, manifest);
    expect(plan).toEqual({ copy: [], skipped: [] });
  });

  // The takes are git-ignored: a word recorded again must not play audio nobody heard.
  it('skips a word whose chosen recording is no longer the one heard', () => {
    const review: Review = {
      กา: { decision: 'take', take: 2, md5: 'changed', note: '', decidedAt },
      ขา: { decision: 'take', take: 3, md5: 'b3', note: '', decidedAt },
    };
    const plan = soundPlan([candidate('กา'), candidate('ขา')], review, manifest);
    expect(plan.copy).toEqual([]);
    expect(plan.skipped.map(({ text }) => text)).toEqual(['กา', 'ขา']);
    expect(plan.skipped[0]!.reason).toMatch(/take 2/);
  });

  it('leaves out the level 2 words, which have no takes yet', () => {
    const review: Review = { กา: { decision: 'take', take: 1, md5: 'a1', note: '', decidedAt } };
    expect(soundPlan([candidate('กา', 2)], review, manifest).copy).toEqual([]);
  });
});

describe('syncSounds', () => {
  it('copies the chosen takes, removes the sounds no longer chosen, and lists the words', () => {
    const root = mkdtempSync(join(tmpdir(), 'sounds-'));
    const takesDir = join(root, 'takes');
    const outDir = join(root, 'out');
    mkdirSync(takesDir);
    mkdirSync(outDir);
    writeFileSync(join(takesDir, `${wordId('กา')}-2.mp3`), 'audio of กา');
    writeFileSync(join(outDir, `${wordId('ขา')}.mp3`), 'old sound of ขา');

    syncSounds(
      { copy: [{ text: 'กา', id: wordId('กา'), file: `${wordId('กา')}-2.mp3` }], skipped: [] },
      {
        takesDir: pathToFileURL(takesDir + '/'),
        outDir: pathToFileURL(outDir + '/'),
        listFile: pathToFileURL(join(root, 'sounds.json')),
      },
    );

    expect(readdirSync(outDir)).toEqual([`${wordId('กา')}.mp3`]);
    expect(readFileSync(join(outDir, `${wordId('กา')}.mp3`), 'utf8')).toBe('audio of กา');
    expect(JSON.parse(readFileSync(join(root, 'sounds.json'), 'utf8'))).toEqual(['กา']);
    expect(existsSync(join(outDir, `${wordId('ขา')}.mp3`))).toBe(false);
  });

  it('creates the folder of sounds when it does not exist yet', () => {
    const root = mkdtempSync(join(tmpdir(), 'sounds-'));
    syncSounds(
      { copy: [], skipped: [] },
      {
        takesDir: pathToFileURL(join(root, 'takes') + '/'),
        outDir: pathToFileURL(join(root, 'out') + '/'),
        listFile: pathToFileURL(join(root, 'sounds.json')),
      },
    );
    expect(readdirSync(join(root, 'out'))).toEqual([]);
    expect(JSON.parse(readFileSync(join(root, 'sounds.json'), 'utf8'))).toEqual([]);
  });
});
