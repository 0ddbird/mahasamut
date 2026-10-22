/**
 * The state of the word review: for each word, which take the reviewer picked,
 * or that none is right, or that the word should go. It lives in
 * data/words/review.json, which is committed: it is days of listening.
 *
 * Everything here is plain functions over plain data; the server does the I/O.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Candidate } from './candidates';
import { writeFileAtomic } from './files';
import type { Manifest, Take } from './takes';

/** What the reviewer decided about a word. */
export type Decision =
  /** Take number `take` says the word right. */
  | { decision: 'take'; take: number }
  /** No take says it right: more takes are wanted. */
  | { decision: 'none' }
  /** The word is not wanted in the game. */
  | { decision: 'remove' };

/**
 * A decision as stored. A take decision also keeps the `md5` of the recording
 * that was heard: the takes are git-ignored and live on one machine, so a take
 * number alone would point at other audio once the word is recorded again.
 * Absent from an entry that predates it.
 */
export type StoredDecision =
  { decision: 'take'; take: number; md5?: string } | { decision: 'none' } | { decision: 'remove' };

/** A decision with the reviewer's remark and the moment it was made. */
export type ReviewEntry = StoredDecision & {
  note: string;
  /** An ISO date and time. */
  decidedAt: string;
};

/** The decisions made so far, by word text. */
export type Review = Record<string, ReviewEntry>;

/** Where a word stands in the review. */
export type Status = 'todo' | 'validated' | 'none' | 'removed';

/** The review of a file; empty if the file does not exist yet. */
export function readReview(file: URL): Review {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Review) : {};
}

/**
 * Replaces the review file, one word per line so that its history reads well
 * in a diff. Every entry is written, even one that has no candidate any more.
 */
export function writeReview(file: URL, review: Review): void {
  const lines = Object.entries(review).map(
    ([text, entry]) => `  ${JSON.stringify(text)}: ${JSON.stringify(entry)}`,
  );
  writeFileAtomic(file, lines.length === 0 ? '{}\n' : `{\n${lines.join(',\n')}\n}\n`);
}

/**
 * The review with one more decision, which replaces the word's previous one.
 * The word keeps its note unless `input` brings a new one (an empty note
 * clears it). The review given is left untouched.
 *
 * @throws if the word is not a level 1 candidate, or the take is not in the manifest.
 */
export function applyDecision(
  review: Review,
  candidates: readonly Candidate[],
  manifest: Manifest,
  text: string,
  input: Decision & { note?: string },
  now: Date,
): Review {
  const candidate = candidates.find((c) => c.text === text && c.level === 1);
  if (!candidate) throw new Error(`"${text}" is not a level 1 word.`);

  let decision: StoredDecision;
  if (input.decision === 'take') {
    const recorded = (manifest[candidate.id] ?? []).find(({ n }) => n === input.take);
    if (!recorded) throw new Error(`"${text}" has no take ${input.take}.`);
    // Saving a note on the take already chosen is no new listening: the md5
    // heard stays, even if the take has been recorded again since.
    const before = review[text];
    const heard =
      before?.decision === 'take' && before.take === input.take ? before.md5 : undefined;
    decision = { decision: 'take', take: input.take, md5: heard ?? recorded.md5 };
  } else {
    decision = { decision: input.decision };
  }

  return {
    ...review,
    [text]: {
      ...decision,
      note: input.note ?? review[text]?.note ?? '',
      decidedAt: now.toISOString(),
    },
  };
}

/**
 * Whether the recording behind a take decision is still the one that was
 * heard: the manifest has that take number with the same md5. False for a take
 * decision whose recording changed or is gone, or that has no md5 to compare;
 * true for none and remove, which rest on no recording.
 */
export function takeMatches(entry: ReviewEntry, takes: readonly Take[]): boolean {
  if (entry.decision !== 'take') return true;
  return (
    entry.md5 !== undefined && takes.some(({ n, md5 }) => n === entry.take && md5 === entry.md5)
  );
}

/** The takes that sound different: one per MP3 content, the lowest number kept. */
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

/** Where a word stands, given its entry in the review if it has one. */
export function status(entry: ReviewEntry | undefined): Status {
  switch (entry?.decision) {
    case undefined:
      return 'todo';
    case 'take':
      return 'validated';
    case 'none':
      return 'none';
    case 'remove':
      return 'removed';
  }
}

/** The texts of the review that no candidate carries: words dropped since the decision. */
export function orphans(review: Review, candidates: readonly Candidate[]): string[] {
  const known = new Set(candidates.map(({ text }) => text));
  return Object.keys(review).filter((text) => !known.has(text));
}

/**
 * The page (counted from 0) of the first word still to do, so that the
 * reviewer resumes where they stopped. When nothing is left to do, the first page.
 */
export function firstPendingPage(
  candidates: readonly Candidate[],
  review: Review,
  pageSize: number,
): number {
  const first = candidates.findIndex(({ text }) => status(review[text]) === 'todo');
  return first === -1 ? 0 : Math.floor(first / pageSize);
}
