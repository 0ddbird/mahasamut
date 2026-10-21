/**
 * Command: records Google TTS takes of the level 1 words, into
 * data/words/takes/ (git-ignored).
 *
 *   npm run words:takes [-- --limit N]
 *
 * Three takes of every level 1 candidate, or of the first N with --limit
 * (to try the command out). Run it again after a stop: it records only the
 * takes that are missing. The key is read from GOOGLE_TTS_API_KEY or .env.local.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { apiKey, DEFAULT_VOICE, synthesize } from '../../scripts/google-tts.mjs';
import type { Candidate } from './candidates';
import { readManifest, recordTakes, takesToRecord } from './takes';

const TAKES_DIR = new URL('../../data/words/takes/', import.meta.url);
const CANDIDATES = new URL('../../data/words/candidates.json', import.meta.url);

/** How many takes each word gets in a default run. */
const TAKES_PER_WORD = 3;

/** The value of `--limit N`, or undefined without it. */
function parseLimit(args: readonly string[]): number | undefined {
  const at = args.indexOf('--limit');
  if (at === -1) return undefined;
  const limit = Number(args[at + 1]);
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error('--limit needs a whole number, 1 or more.');
  return limit;
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const limit = parseLimit(process.argv.slice(2));
    const key = await apiKey();
    if (!key) throw new Error('No GOOGLE_TTS_API_KEY in the environment or in .env.local.');

    const { candidates } = JSON.parse(readFileSync(CANDIDATES, 'utf8')) as {
      candidates: Candidate[];
    };
    const level1 = candidates.filter((candidate) => candidate.level === 1).slice(0, limit);
    const jobs = takesToRecord(level1, readManifest(TAKES_DIR), TAKES_PER_WORD);
    console.log(`${jobs.length} takes to record, for ${level1.length} words.`);

    const { done } = await recordTakes(jobs, {
      dir: TAKES_DIR,
      synthesize: (text) => synthesize(text, key),
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
