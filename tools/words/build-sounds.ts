/**
 * Gives the game the sound of each validated word: copies the take the
 * reviewer chose to public/audio/words/<id>.mp3, removes the sounds no longer
 * chosen, and lists the words that have one in src/thai/words/sounds.json.
 *
 *   npm run words:sounds
 *
 * Run it again after reviewing more, like `npm run words:pool`. A word whose
 * chosen recording changed since it was heard gets no sound, and is named.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Candidate } from './candidates';
import { writeFileAtomic } from './files';
import { readReview, takeMatches } from './review-state';
import type { Review } from './review-state';
import { readManifest } from './takes';
import type { Manifest } from './takes';

const CANDIDATES_FILE = new URL('../../data/words/candidates.json', import.meta.url);
const REVIEW_FILE = new URL('../../data/words/review.json', import.meta.url);
const TAKES_DIR = new URL('../../data/words/takes/', import.meta.url);
const SOUNDS_DIR = new URL('../../public/audio/words/', import.meta.url);
const SOUNDS_LIST = new URL('../../src/thai/words/sounds.json', import.meta.url);

/** The sound a word gets: the take file to copy, under the word's id. */
export interface SoundCopy {
  text: string;
  id: string;
  file: string;
}

export interface SoundPlan {
  copy: SoundCopy[];
  /** The validated words left without a sound, and why. */
  skipped: { text: string; reason: string }[];
}

/**
 * The sounds of the level 1 words the reviewer validated, in the order of the
 * candidates. Only a take decision whose recording is still the one heard
 * gives a sound.
 */
export function soundPlan(
  candidates: readonly Candidate[],
  review: Review,
  manifest: Manifest,
): SoundPlan {
  const plan: SoundPlan = { copy: [], skipped: [] };
  for (const { text, id, level } of candidates) {
    const entry = review[text];
    if (level !== 1 || entry?.decision !== 'take') continue;
    const takes = manifest[id] ?? [];
    const chosen = takes.find(({ n }) => n === entry.take);
    if (chosen === undefined || !takeMatches(entry, takes)) {
      plan.skipped.push({ text, reason: `take ${entry.take} is not the recording that was heard` });
      continue;
    }
    plan.copy.push({ text, id, file: chosen.file });
  }
  return plan;
}

/**
 * Applies `plan`: writes each sound (atomically), removes the other MP3s of
 * `outDir`, and writes the sorted list of the words with a sound to `listFile`.
 */
export function syncSounds(
  plan: SoundPlan,
  { takesDir, outDir, listFile }: { takesDir: URL; outDir: URL; listFile: URL },
): void {
  mkdirSync(outDir, { recursive: true });
  const wanted = new Set(plan.copy.map(({ id }) => `${id}.mp3`));
  for (const { id, file } of plan.copy) {
    writeFileAtomic(new URL(`${id}.mp3`, outDir), readFileSync(new URL(file, takesDir)));
  }
  for (const name of readdirSync(outDir)) {
    if (name.endsWith('.mp3') && !wanted.has(name)) rmSync(new URL(name, outDir));
  }
  // One word per line, like pool.json: a change shows in git as the words that changed.
  const texts = plan.copy.map(({ text }) => text).sort();
  const lines = texts.map((text) => `  ${JSON.stringify(text)}`).join(',\n');
  writeFileAtomic(listFile, texts.length === 0 ? '[]\n' : `[\n${lines}\n]\n`);
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { candidates } = JSON.parse(readFileSync(CANDIDATES_FILE, 'utf8')) as {
      candidates: Candidate[];
    };
    const plan = soundPlan(candidates, readReview(REVIEW_FILE), readManifest(TAKES_DIR));
    syncSounds(plan, { takesDir: TAKES_DIR, outDir: SOUNDS_DIR, listFile: SOUNDS_LIST });
    console.log(`${plan.copy.length} words have a sound in public/audio/words/.`);
    for (const { text, reason } of plan.skipped) console.error(`No sound for ${text}: ${reason}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
