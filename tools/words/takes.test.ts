import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Candidate } from './candidates';
import { readManifest, recordTakes, takesToRecord } from './takes';
import type { Manifest } from './takes';

const candidate = (text: string, id: string) => ({ text, id }) as Candidate;

const take = (n: number) => ({
  n,
  file: `a-${n}.mp3`,
  text: 'ก',
  voice: 'v',
  md5: '',
  recordedAt: '',
});

describe('takesToRecord', () => {
  const word = candidate('กา', 'a');

  it('asks takes 1 to 3 of a new word', () => {
    expect(takesToRecord([word], {}, 3)).toEqual([
      { id: 'a', text: 'กา', n: 1 },
      { id: 'a', text: 'กา', n: 2 },
      { id: 'a', text: 'กา', n: 3 },
    ]);
  });

  it('asks nothing of a word that has three takes', () => {
    const manifest: Manifest = { a: [take(1), take(2), take(3)] };
    expect(takesToRecord([word], manifest, 3)).toEqual([]);
  });

  it('asks takes 4 to 6 of a word that has three, when six are wanted', () => {
    const manifest: Manifest = { a: [take(1), take(2), take(3)] };
    expect(takesToRecord([word], manifest, 6).map(({ n }) => n)).toEqual([4, 5, 6]);
  });

  it('completes a word that has only some of its takes', () => {
    expect(takesToRecord([word], { a: [take(1)] }, 3).map(({ n }) => n)).toEqual([2, 3]);
  });
});

describe('recordTakes', () => {
  let dir: URL;
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'takes-'));
    dir = pathToFileURL(`${folder}/`);
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  const jobs = [
    { id: 'a', text: 'กา', n: 1 },
    { id: 'a', text: 'กา', n: 2 },
  ];
  const statusError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
  const options = (synthesize: (text: string) => Promise<Uint8Array>) => ({
    dir,
    synthesize,
    voice: 'test-voice',
    retries: 2,
    delayMs: 0,
    onProgress: () => {},
  });

  it('a take written to a temporary file is not listed until renamed', async () => {
    let calls = 0;
    const synthesize = async () => {
      if (++calls === 2) throw new Error('the connection dropped');
      return Buffer.from('mp3');
    };

    await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow('the connection dropped');

    expect(readdirSync(folder).filter((name) => name.endsWith('.mp3'))).toEqual(['a-1.mp3']);
    expect(readdirSync(folder).filter((name) => name.endsWith('.tmp'))).toEqual([]);
    expect(
      Object.values(readManifest(dir))
        .flat()
        .map(({ file }) => file),
    ).toEqual(['a-1.mp3']);
  });

  it('retries a 429 and records the take', async () => {
    let calls = 0;
    const synthesize = async () => {
      if (++calls === 1) throw statusError(429);
      return Buffer.from('mp3');
    };

    const result = await recordTakes(jobs.slice(0, 1), options(synthesize));

    expect(result).toEqual({ done: 1 });
    expect(calls).toBe(2);
    expect(readManifest(dir)['a']).toHaveLength(1);
  });

  it('retries a 5xx too', async () => {
    let calls = 0;
    const synthesize = async () => {
      if (++calls === 1) throw statusError(503);
      return Buffer.from('mp3');
    };
    await recordTakes(jobs.slice(0, 1), options(synthesize));
    expect(calls).toBe(2);
  });

  it('stops at once on a 401, without retrying', async () => {
    let calls = 0;
    const synthesize = async () => {
      calls++;
      throw statusError(401);
    };

    await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow('401');

    expect(calls).toBe(1);
    expect(readManifest(dir)).toEqual({});
  });

  it('gives up after the last retry with the count done', async () => {
    let calls = 0;
    const synthesize = async () => {
      if (++calls <= 1) return Buffer.from('mp3');
      throw statusError(429);
    };

    await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow(/1 take/);
    // The first take, then the second tried once and retried twice.
    expect(calls).toBe(4);
  });

  it('stores the text sent, the voice and the md5 of the MP3', async () => {
    const sent: string[] = [];
    const synthesize = async (text: string) => {
      sent.push(text);
      return Buffer.from('some mp3 bytes');
    };

    await recordTakes(jobs.slice(0, 1), options(synthesize));

    const [entry] = readManifest(dir)['a']!;
    expect(sent).toEqual(['กา']);
    expect(entry).toMatchObject({
      n: 1,
      file: 'a-1.mp3',
      text: 'กา',
      voice: 'test-voice',
      md5: createHash('md5').update('some mp3 bytes').digest('hex'),
    });
    expect(readFileSync(join(folder, 'a-1.mp3'), 'utf8')).toBe('some mp3 bytes');
    expect(Number.isNaN(Date.parse(entry!.recordedAt))).toBe(false);
  });

  it('reports each take done', async () => {
    const progress: number[] = [];
    await recordTakes(jobs, {
      ...options(async () => Buffer.from('mp3')),
      onProgress: ({ done, total }) => progress.push(done / total),
    });
    expect(progress).toEqual([0.5, 1]);
  });

  describe('one run at a time, never over a take', () => {
    const lockFile = () => join(folder, '.lock');
    const mp3s = () => readdirSync(folder).filter((name) => name.endsWith('.mp3'));

    it('fails at once, without synthesizing, while another run holds the lock', async () => {
      writeFileSync(lockFile(), 'another run');
      let calls = 0;
      const synthesize = async () => {
        calls++;
        return Buffer.from('mp3');
      };

      await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow(/\.lock/);

      expect(calls).toBe(0);
      // The lock of the other run is still there, and nothing was recorded.
      expect(readFileSync(lockFile(), 'utf8')).toBe('another run');
      expect(mp3s()).toEqual([]);
    });

    it('holds the lock during the run and removes it afterwards', async () => {
      let lockedDuringRun = false;
      const synthesize = async () => {
        lockedDuringRun = existsSync(lockFile());
        return Buffer.from('mp3');
      };

      await recordTakes(jobs, options(synthesize));

      expect(lockedDuringRun).toBe(true);
      expect(existsSync(lockFile())).toBe(false);
    });

    it('removes the lock after a failed run', async () => {
      const synthesize = async () => {
        throw statusError(401);
      };
      await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow('401');
      expect(existsSync(lockFile())).toBe(false);
    });

    it('never replaces a take that already has its file', async () => {
      writeFileSync(join(folder, 'a-1.mp3'), 'old bytes');
      let calls = 0;
      const synthesize = async () => {
        calls++;
        return Buffer.from('new bytes');
      };

      await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow(/a-1\.mp3/);

      expect(calls).toBe(0);
      expect(readFileSync(join(folder, 'a-1.mp3'), 'utf8')).toBe('old bytes');
      expect(readManifest(dir)).toEqual({});
      expect(existsSync(lockFile())).toBe(false);
    });

    it('never replaces a file that appeared while its take was being synthesized', async () => {
      const synthesize = async () => {
        writeFileSync(join(folder, 'a-1.mp3'), 'old bytes');
        return Buffer.from('new bytes');
      };

      await expect(recordTakes(jobs, options(synthesize))).rejects.toThrow(/a-1\.mp3/);

      expect(readFileSync(join(folder, 'a-1.mp3'), 'utf8')).toBe('old bytes');
      expect(readManifest(dir)).toEqual({});
    });
  });
});
