/**
 * Writes the game's pool: src/thai/words/pool.json, the texts of the level 1
 * candidates that the review has not removed.
 *
 *   npm run words:pool
 *
 * A word still to review, validated, or without a right take stays in the
 * pool: only a removed word leaves it. Run it again after reviewing more.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Candidate } from './candidates';
import { writeFileAtomic } from './files';
import { readReview, status } from './review-state';
import type { Review } from './review-state';

const CANDIDATES_FILE = new URL('../../data/words/candidates.json', import.meta.url);
const REVIEW_FILE = new URL('../../data/words/review.json', import.meta.url);
const POOL_FILE = new URL('../../src/thai/words/pool.json', import.meta.url);

/** The texts of the level 1 candidates not removed by the review, sorted. */
export function poolTexts(candidates: readonly Candidate[], review: Review): string[] {
  return candidates
    .filter((candidate) => candidate.level === 1)
    .filter((candidate) => status(review[candidate.text]) !== 'removed')
    .map((candidate) => candidate.text)
    .sort();
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { candidates } = JSON.parse(readFileSync(CANDIDATES_FILE, 'utf8')) as {
      candidates: Candidate[];
    };
    const texts = poolTexts(candidates, readReview(REVIEW_FILE));

    // One word per line: a change of the pool shows in git as the words that changed.
    const lines = texts.map((text) => `  ${JSON.stringify(text)}`).join(',\n');
    writeFileAtomic(POOL_FILE, `[\n${lines}\n]\n`);
    console.log(`${texts.length} words (src/thai/words/pool.json)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
