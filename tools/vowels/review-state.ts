/**
 * State and decisions for Thai vowel review.
 * Stored in data/vowels/review.json.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { writeFileAtomic } from '../words/files';
import type { Manifest } from './takes';
import { VOWELS_BY_ID } from './vowels-data';

export type VowelDecision = 'take' | 'current' | 'none';

export interface VowelReviewEntry {
  decision: VowelDecision;
  /** Take number when decision is 'take' */
  take?: number;
  /** MD5 of the audio file that was chosen */
  md5?: string;
  note?: string;
  decidedAt: string;
  publishedAt?: string;
}

export type VowelReview = Record<string, VowelReviewEntry>;

export function readReview(file: URL): VowelReview {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as VowelReview) : {};
}

export function writeReview(file: URL, review: VowelReview): void {
  const lines = Object.entries(review).map(
    ([id, entry]) => `  ${JSON.stringify(id)}: ${JSON.stringify(entry)}`,
  );
  writeFileAtomic(file, lines.length === 0 ? '{}\n' : `{\n${lines.join(',\n')}\n}\n`);
}

/**
 * Returns whether a sound file exists in public/audio/vowels/ and its MD5 hash.
 */
export function getCurrentSoundInfo(publicDir: URL, id: string): { exists: boolean; md5?: string } {
  const file = new URL(`${id}.mp3`, publicDir);
  if (!existsSync(file)) return { exists: false };
  const content = readFileSync(file);
  return {
    exists: true,
    md5: createHash('md5').update(content).digest('hex'),
  };
}

export interface DecisionInput {
  decision: VowelDecision;
  take?: number;
  note?: string;
}

/**
 * Applies a reviewer's decision for a vowel.
 */
export function applyDecision(
  review: VowelReview,
  manifest: Manifest,
  publicDir: URL,
  id: string,
  input: DecisionInput,
  now = new Date(),
): VowelReview {
  if (!VOWELS_BY_ID.has(id as never)) {
    throw new Error(`Unknown vowel "${id}".`);
  }

  let md5: string | undefined;
  if (input.decision === 'take') {
    if (typeof input.take !== 'number' || !Number.isInteger(input.take)) {
      throw new Error(`Take number must be an integer for vowel "${id}".`);
    }
    const takes = manifest[id] ?? [];
    const take = takes.find((t) => t.n === input.take);
    if (!take) {
      throw new Error(`Take ${input.take} not found for vowel "${id}".`);
    }
    md5 = take.md5;
  } else if (input.decision === 'current') {
    const info = getCurrentSoundInfo(publicDir, id);
    if (!info.exists || !info.md5) {
      throw new Error(`No current sound exists in public/audio/vowels/ for "${id}".`);
    }
    md5 = info.md5;
  }

  const previous = review[id];
  return {
    ...review,
    [id]: {
      decision: input.decision,
      ...(input.decision === 'take' ? { take: input.take } : {}),
      ...(md5 ? { md5 } : {}),
      note: input.note !== undefined ? input.note : (previous?.note ?? ''),
      decidedAt: now.toISOString(),
      ...(previous?.publishedAt ? { publishedAt: previous.publishedAt } : {}),
    },
  };
}

/**
 * Copies the selected take from data/vowels/takes/ into public/audio/vowels/<id>.mp3.
 */
export function publishTake(
  publicDir: URL,
  takesDir: URL,
  id: string,
  takeN: number,
): { md5: string } {
  const source = new URL(`${id}-${takeN}.mp3`, takesDir);
  if (!existsSync(source)) {
    throw new Error(`Source take file ${id}-${takeN}.mp3 does not exist.`);
  }
  const dest = new URL(`${id}.mp3`, publicDir);
  const data = readFileSync(source);
  copyFileSync(source, dest);
  return {
    md5: createHash('md5').update(data).digest('hex'),
  };
}

/**
 * Publishes all currently validated take decisions to public/audio/vowels/.
 */
export function publishAll(
  review: VowelReview,
  takesDir: URL,
  publicDir: URL,
): { published: string[]; skipped: string[]; updatedReview: VowelReview } {
  const published: string[] = [];
  const skipped: string[] = [];
  const updatedReview: VowelReview = { ...review };
  const now = new Date().toISOString();

  for (const [id, entry] of Object.entries(review)) {
    if (entry.decision === 'take' && entry.take !== undefined) {
      try {
        publishTake(publicDir, takesDir, id, entry.take);
        published.push(id);
        updatedReview[id] = {
          ...entry,
          publishedAt: now,
        };
      } catch {
        skipped.push(id);
      }
    } else {
      skipped.push(id);
    }
  }

  return { published, skipped, updatedReview };
}
