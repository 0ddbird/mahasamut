/**
 * Command: records Google TTS takes of the level 1 words, into
 * data/words/takes/ (git-ignored).
 *
 *   npm run words:takes [-- --limit N] [--more]
 *
 * Three takes of every level 1 candidate, or of the first N with --limit
 * (to try the command out). Run it again after a stop: it records only the
 * takes that are missing. With --more, three further takes of each word the
 * review marked "none" (no take says it right), numbered after the ones it has.
 * Only one run at a time: data/words/takes/.lock is held during a run. After
 * a crash, if the command says another recording is running and none is,
 * delete that file. The key is read from GOOGLE_TTS_API_KEY or .env.local.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { apiKey, DEFAULT_VOICE, synthesize } from '../../scripts/google-tts.mjs';
import type { Candidate } from './candidates';
import { readReview } from './review-state';
import type { Review } from './review-state';
import { readManifest, recordTakes, takesToRecord } from './takes';
import type { Job, Manifest } from './takes';

const TAKES_DIR = new URL('../../data/words/takes/', import.meta.url);
const CANDIDATES = new URL('../../data/words/candidates.json', import.meta.url);
const REVIEW = new URL('../../data/words/review.json', import.meta.url);

/** How many takes each word gets in a default run. */
const TAKES_PER_WORD = 3;

/** The arguments of the command. */
export interface Args {
  /** Only the first N words, to try the command out. */
  limit: number | undefined;
  /** Record further takes of the words the review marked "none". */
  more: boolean;
}

const ACCEPTED_ARGUMENTS = '--limit N, --more';

/**
 * Reads the command line. Anything it does not know is an error, so that a
 * typo cannot start the full run, which is paid for by the take.
 */
export function parseArgs(args: readonly string[]): Args {
  let limit: number | undefined;
  let more = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--more') {
      if (more) throw new Error('--more is given twice.');
      more = true;
    } else if (arg === '--limit') {
      if (limit !== undefined) throw new Error('--limit is given twice.');
      limit = Number(args[++i]);
      if (!Number.isInteger(limit) || limit < 1)
        throw new Error('--limit needs a whole number, 1 or more.');
    } else {
      throw new Error(`Unknown argument "${arg}". Accepted: ${ACCEPTED_ARGUMENTS}.`);
    }
  }
  return { limit, more };
}

/**
 * The takes to record. By default, what the level 1 words lack to have
 * TAKES_PER_WORD each. With `more`, TAKES_PER_WORD further takes of each word
 * whose decision in the review is "none", numbered after the ones it has;
 * a validated, removed or undecided word gets nothing. `limit` keeps the
 * first N words concerned.
 */
export function selectJobs(
  candidates: readonly Candidate[],
  manifest: Manifest,
  review: Review,
  { limit, more }: { limit?: number; more: boolean },
): Job[] {
  const level1 = candidates.filter((candidate) => candidate.level === 1);
  if (!more) return takesToRecord(level1.slice(0, limit), manifest, TAKES_PER_WORD);

  return level1
    .filter(({ text }) => review[text]?.decision === 'none')
    .slice(0, limit)
    .flatMap((word) =>
      takesToRecord([word], manifest, (manifest[word.id]?.length ?? 0) + TAKES_PER_WORD),
    );
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const key = await apiKey();
    if (!key) throw new Error('No GOOGLE_TTS_API_KEY in the environment or in .env.local.');

    const { candidates } = JSON.parse(readFileSync(CANDIDATES, 'utf8')) as {
      candidates: Candidate[];
    };
    const jobs = selectJobs(candidates, readManifest(TAKES_DIR), readReview(REVIEW), args);
    console.log(
      `${jobs.length} takes to record, for ${new Set(jobs.map(({ id }) => id)).size} words.`,
    );

    const { done } = await recordTakes(jobs, {
      dir: TAKES_DIR,
      synthesize: (text) => synthesize(text, key, DEFAULT_VOICE),
      voice: DEFAULT_VOICE,
      retries: 6,
      delayMs: 2000,
      onProgress: ({ done, total, job }) => {
        if (done % 50 === 0 || done === total) console.log(`${done}/${total} (${job.text})`);
      },
    });
    console.log(`Done: ${done} takes recorded in data/words/takes/.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
