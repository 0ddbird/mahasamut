/**
 * Records takes of each word: several MP3s of Google's voice saying the same
 * text, among which the reviewer will pick the one that sounds right.
 *
 * The takes live in data/words/takes/ (git-ignored) as `<id>-<n>.mp3`, listed
 * in manifest.json. A take is in the manifest only once its file is complete,
 * so a run that stops half way (a quota, a lost connection) can simply run again:
 * it records what is missing.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Candidate } from './candidates';
import { writeFileAtomic } from './files';

/** One recording of a word. */
export interface Take {
  /** Its number among the takes of the word, from 1. */
  n: number;
  /** The name of the MP3, next to the manifest. */
  file: string;
  /** The text sent to the voice. */
  text: string;
  voice: string;
  /** The MD5 of the MP3, to tell a changed file from an untouched one. */
  md5: string;
  /** When it was recorded, as an ISO date and time. */
  recordedAt: string;
}

/** The takes of each word, by word id. */
export type Manifest = Record<string, Take[]>;

/** A take to record. */
export interface Job {
  id: string;
  text: string;
  n: number;
}

const manifestFile = (dir: URL) => new URL('manifest.json', dir);

/** The manifest of a takes folder; empty if the folder has none yet. */
export function readManifest(dir: URL): Manifest {
  const file = manifestFile(dir);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Manifest) : {};
}

/** Replaces the manifest of a takes folder, one word per line so that it stays readable. */
export function writeManifest(dir: URL, manifest: Manifest): void {
  const lines = Object.entries(manifest).map(
    ([id, takes]) => `  ${JSON.stringify(id)}: ${JSON.stringify(takes)}`,
  );
  writeFileAtomic(manifestFile(dir), `{\n${lines.join(',\n')}\n}\n`);
}

/**
 * The takes missing for each candidate to have `wanted` of them, numbered
 * after the highest take it already has.
 */
export function takesToRecord(
  candidates: readonly Candidate[],
  manifest: Manifest,
  wanted: number,
): Job[] {
  return candidates.flatMap(({ id, text }) => {
    const existing = manifest[id] ?? [];
    const highest = Math.max(0, ...existing.map(({ n }) => n));
    const missing = Math.max(0, wanted - existing.length);
    return Array.from({ length: missing }, (_, i) => ({ id, text, n: highest + i + 1 }));
  });
}

export interface RecordOptions {
  /** The takes folder, with a trailing slash. */
  dir: URL;
  /** The MP3 of a text; an error with a `status` property stands for an HTTP failure. */
  synthesize: (text: string) => Promise<Uint8Array>;
  /** The name of the voice, noted in the manifest. */
  voice: string;
  /** How many times to try again after a 429 or a 5xx. */
  retries: number;
  /** The wait before the first retry; it doubles at each further one. */
  delayMs: number;
  /** Called after each take, with how many of the run's takes are done. */
  onProgress: (progress: { done: number; total: number; job: Job }) => void;
}

/** The HTTP status of a failure of `synthesize`, if it has one. */
const statusOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status: unknown }).status)
    : undefined;

/** Whether trying the same call again can succeed: a quota or a server error. */
const isRetryable = (status: number | undefined) =>
  status !== undefined && (status === 429 || status >= 500);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The file that marks a takes folder as being recorded into. */
const LOCK_FILE = '.lock';

/** @throws if the MP3 already exists. */
function refuseExisting(dir: URL, file: string): void {
  if (existsSync(new URL(file, dir))) {
    throw new Error(`${file} already exists in the takes folder: a take is never replaced.`);
  }
}

/**
 * Records the takes one after the other, one run at a time per folder (a
 * `.lock` file; see acquireLock) and never over an existing MP3. Each MP3 is written whole before the
 * take is added to the manifest, which is rewritten at once, so that a stop at
 * any moment leaves a manifest that lists complete files only.
 *
 * A 429 or a 5xx is tried again up to `retries` times, with a growing wait.
 * Any other failure, a 401 or a 403 for one (the key is wrong: more calls
 * would only repeat it), stops the run at once.
 *
 * @returns how many takes were recorded.
 * @throws with the number of takes done, when a call fails for good.
 */
export async function recordTakes(
  jobs: readonly Job[],
  { dir, synthesize, voice, retries, delayMs, onProgress }: RecordOptions,
): Promise<{ done: number }> {
  mkdirSync(dir, { recursive: true });
  const releaseLock = acquireLock(dir);
  try {
    return await recordLocked(jobs, { dir, synthesize, voice, retries, delayMs, onProgress });
  } finally {
    releaseLock();
  }
}

/**
 * Takes the lock of the folder: a `.lock` file, created only if it does not
 * exist yet, so that two runs cannot write the same manifest and the same
 * MP3 names at once.
 *
 * @returns the function that releases the lock.
 * @throws if another run holds the lock, or crashed and left it behind.
 */
function acquireLock(dir: URL): () => void {
  const lock = new URL(LOCK_FILE, dir);
  try {
    writeFileSync(lock, `${process.pid}\n`, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new Error(
      `Another recording is running in ${fileURLToPath(dir)} (${LOCK_FILE} exists). ` +
        `If none is, a run crashed: delete ${fileURLToPath(lock)} and run again.`,
      { cause: error },
    );
  }
  return () => rmSync(lock, { force: true });
}

async function recordLocked(
  jobs: readonly Job[],
  { dir, synthesize, voice, retries, delayMs, onProgress }: RecordOptions,
): Promise<{ done: number }> {
  const manifest = readManifest(dir);
  let done = 0;

  for (const job of jobs) {
    const file = `${job.id}-${job.n}.mp3`;
    // A take that exists is never replaced, whatever the manifest says: it may
    // be the one a reviewer heard. Checked before the call, which is paid for.
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
    onProgress({ done, total: jobs.length, job });
  }
  return { done };
}
