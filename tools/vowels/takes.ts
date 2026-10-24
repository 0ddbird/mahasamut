/**
 * Records takes of each vowel: multiple MP3s of Google's TTS voice reciting each
 * vowel ("สระ อะ", "สระ อา"...), from which the reviewer picks the best sounding one.
 *
 * Takes live in data/vowels/takes/ (git-ignored) as `<id>-<n>.mp3`, listed in manifest.json.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from '../words/files';
import type { VowelItem } from './vowels-data';

export interface Take {
  /** Take number from 1 upwards */
  n: number;
  /** File name relative to takes folder, e.g. "a-1.mp3" */
  file: string;
  /** Recited text sent to TTS, e.g. "สระ อะ" */
  text: string;
  voice: string;
  /** MD5 hash of the MP3 */
  md5: string;
  recordedAt: string;
}

export type Manifest = Record<string, Take[]>;

export interface Job {
  id: string;
  text: string;
  n: number;
}

const manifestFile = (dir: URL) => new URL('manifest.json', dir);

export function readManifest(dir: URL): Manifest {
  const file = manifestFile(dir);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Manifest) : {};
}

export function writeManifest(dir: URL, manifest: Manifest): void {
  const lines = Object.entries(manifest).map(
    ([id, takes]) => `  ${JSON.stringify(id)}: ${JSON.stringify(takes)}`,
  );
  writeFileAtomic(manifestFile(dir), lines.length === 0 ? '{}\n' : `{\n${lines.join(',\n')}\n}\n`);
}

/**
 * Filter identical sounding takes (same MD5), keeping the lowest take number.
 */
export function uniqueTakes(takes: readonly Take[]): Take[] {
  const seen = new Set<string>();
  return [...takes]
    .sort((a, b) => a.n - b.n)
    .filter(({ md5 }) => {
      if (seen.has(md5)) return false;
      seen.add(md5);
      return true;
    });
}

/**
 * Calculates missing takes for each vowel up to `wanted` takes.
 */
export function takesToRecord(
  vowels: readonly VowelItem[],
  manifest: Manifest,
  wanted: number,
): Job[] {
  return vowels.flatMap(({ id, text }) => {
    const existing = manifest[id] ?? [];
    const highest = Math.max(0, ...existing.map(({ n }) => n));
    const missing = Math.max(0, wanted - existing.length);
    return Array.from({ length: missing }, (_, i) => ({ id, text, n: highest + i + 1 }));
  });
}

/**
 * Calculates additional `count` takes for the specified vowels, numbered after their highest take.
 */
export function additionalTakes(
  vowels: readonly VowelItem[],
  manifest: Manifest,
  count: number,
): Job[] {
  return vowels.flatMap(({ id, text }) => {
    const existing = manifest[id] ?? [];
    const highest = Math.max(0, ...existing.map(({ n }) => n));
    return Array.from({ length: count }, (_, i) => ({ id, text, n: highest + i + 1 }));
  });
}

export interface RecordOptions {
  dir: URL;
  synthesize: (text: string) => Promise<Uint8Array>;
  voice: string;
  retries: number;
  delayMs: number;
  onProgress?: (progress: { done: number; total: number; job: Job }) => void;
}

const statusOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status: unknown }).status)
    : undefined;

const isRetryable = (status: number | undefined) =>
  status !== undefined && (status === 429 || status >= 500);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LOCK_FILE = '.lock';

function refuseExisting(dir: URL, file: string): void {
  if (existsSync(new URL(file, dir))) {
    throw new Error(`${file} already exists in the takes folder: a take is never replaced.`);
  }
}

export function acquireLock(dir: URL): () => void {
  const lock = new URL(LOCK_FILE, dir);
  try {
    writeFileSync(lock, `${process.pid}\n`, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new Error(
      `Another recording is running in ${fileURLToPath(dir)} (${LOCK_FILE} exists). ` +
        `If none is, delete ${fileURLToPath(lock)} and run again.`,
      { cause: error },
    );
  }
  return () => rmSync(lock, { force: true });
}

export async function recordTakes(
  jobs: readonly Job[],
  { dir, synthesize, voice, retries, delayMs, onProgress }: RecordOptions,
): Promise<{ done: number }> {
  mkdirSync(dir, { recursive: true });
  const releaseLock = acquireLock(dir);
  try {
    const manifest = readManifest(dir);
    let done = 0;

    for (const job of jobs) {
      const file = `${job.id}-${job.n}.mp3`;
      refuseExisting(dir, file);

      let mp3: Uint8Array | undefined;
      for (let attempt = 0; mp3 === undefined; attempt++) {
        try {
          mp3 = await synthesize(job.text);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!isRetryable(statusOf(error)) || attempt >= retries) {
            const count = `${done} take${done === 1 ? '' : 's'}`;
            throw new Error(`Stopped on ${job.id}-${job.n} after ${count} done: ${message}`, {
              cause: error,
            });
          }
          await sleep(delayMs * 2 ** attempt);
        }
      }

      refuseExisting(dir, file);
      writeFileAtomic(new URL(file, dir), mp3);
      (manifest[job.id] ??= []).push({
        n: job.n,
        file,
        text: job.text,
        voice,
        md5: createHash('md5').update(mp3).digest('hex'),
        recordedAt: new Date().toISOString(),
      });
      writeManifest(dir, manifest);
      done++;
      onProgress?.({ done, total: jobs.length, job });
    }
    return { done };
  } finally {
    releaseLock();
  }
}
