/// <reference types="node" />
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  additionalTakes,
  readManifest,
  recordTakes,
  takesToRecord,
  uniqueTakes,
  writeManifest,
} from './takes';
import type { Manifest, Take } from './takes';
import type { VowelItem } from './vowels-data';

const DUMMY_VOWELS: VowelItem[] = [
  {
    id: 'a',
    carrier: 'อะ',
    text: 'สระ อะ',
    ipa: 'a',
    open: '◌ะ',
    length: 'short',
    pairIndex: 0,
    isPairStart: true,
  },
  {
    id: 'aa',
    carrier: 'อา',
    text: 'สระ อา',
    ipa: 'aː',
    open: '◌า',
    length: 'long',
    pairIndex: 0,
    isPairStart: false,
  },
];

describe('tools/vowels/takes', () => {
  let tempDir: URL;

  beforeEach(() => {
    const p = `${tmpdir()}/vowels-takes-test-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    mkdirSync(p, { recursive: true });
    tempDir = pathToFileURL(p);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('calculates missing takes up to wanted', () => {
    const manifest: Manifest = {
      a: [
        {
          n: 1,
          file: 'a-1.mp3',
          text: 'สระ อะ',
          voice: 'v',
          md5: '123',
          recordedAt: '',
        },
      ],
    };
    const jobs = takesToRecord(DUMMY_VOWELS, manifest, 2);
    expect(jobs).toEqual([
      { id: 'a', text: 'สระ อะ', n: 2 },
      { id: 'aa', text: 'สระ อา', n: 1 },
      { id: 'aa', text: 'สระ อา', n: 2 },
    ]);
  });

  it('calculates additional takes numbered after existing ones', () => {
    const manifest: Manifest = {
      a: [
        {
          n: 1,
          file: 'a-1.mp3',
          text: 'สระ อะ',
          voice: 'v',
          md5: '123',
          recordedAt: '',
        },
        {
          n: 2,
          file: 'a-2.mp3',
          text: 'สระ อะ',
          voice: 'v',
          md5: '456',
          recordedAt: '',
        },
      ],
    };
    const jobs = additionalTakes([DUMMY_VOWELS[0]], manifest, 2);
    expect(jobs).toEqual([
      { id: 'a', text: 'สระ อะ', n: 3 },
      { id: 'a', text: 'สระ อะ', n: 4 },
    ]);
  });

  it('deduplicates identical takes via uniqueTakes', () => {
    const takes: Take[] = [
      { n: 1, file: 'a-1.mp3', text: 'สระ อะ', voice: 'v', md5: 'same', recordedAt: '' },
      { n: 2, file: 'a-2.mp3', text: 'สระ อะ', voice: 'v', md5: 'different', recordedAt: '' },
      { n: 3, file: 'a-3.mp3', text: 'สระ อะ', voice: 'v', md5: 'same', recordedAt: '' },
    ];
    expect(uniqueTakes(takes).map((t) => t.n)).toEqual([1, 2]);
  });

  it('reads and writes manifest atomically', () => {
    expect(readManifest(tempDir)).toEqual({});
    const manifest: Manifest = {
      a: [
        { n: 1, file: 'a-1.mp3', text: 'สระ อะ', voice: 'v', md5: 'abc', recordedAt: '2026-10-24' },
      ],
    };
    writeManifest(tempDir, manifest);
    expect(readManifest(tempDir)).toEqual(manifest);
  });

  it('records takes and updates manifest', async () => {
    const synthesize = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    const jobs = [{ id: 'a', text: 'สระ อะ', n: 1 }];

    const { done } = await recordTakes(jobs, {
      dir: tempDir,
      synthesize,
      voice: 'test-voice',
      retries: 2,
      delayMs: 10,
    });

    expect(done).toBe(1);
    expect(synthesize).toHaveBeenCalledWith('สระ อะ');
    const manifest = readManifest(tempDir);
    expect(manifest.a).toHaveLength(1);
    expect(manifest.a[0].file).toBe('a-1.mp3');
  });
});
