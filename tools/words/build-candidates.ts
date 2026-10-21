/**
 * Writes the frozen list of candidates: data/words/candidates.json (levels 1
 * and 2) and data/words/corpus-check.csv (level 2, to check on the web).
 *
 *   npm run words:candidates [-- --force]
 *
 * The list is frozen once the review starts: changing the rules of selection
 * then would add or remove words under the reviewer's feet. So the command
 * refuses to overwrite candidates.json without --force. The answers already
 * written in the `exists` column of the CSV survive a new run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validSyllables } from '../../src/thai/generator/syllables';
import { selectCandidates, toneCaseKey } from './candidates';
import type { Candidate } from './candidates';
import { readSources } from './sources';

const DEFAULT_OUT_DIR = fileURLToPath(new URL('../../data/words/', import.meta.url));
const DEFAULT_SOURCES_DIR = new URL('../../data/words/sources/', import.meta.url);

const CSV_HEADER = 'word,frequency,tone_case,tone,link,exists';

/** A CSV field, quoted when it holds a comma, a quote or a line break. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The fields of one CSV line. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * The CSV of the level 2 candidates, one row each, with the `exists` answers
 * of the previous CSV (if any) kept next to their words. A new word gets an
 * empty answer.
 */
export function mergeCorpusCsv(previous: string | null, level2: readonly Candidate[]): string {
  const answers = new Map<string, string>();
  for (const line of (previous ?? '').split(/\r?\n/).slice(1)) {
    if (line === '') continue;
    const fields = parseCsvLine(line);
    answers.set(fields[0]!, fields[5] ?? '');
  }

  const rows = level2.map((candidate) =>
    [
      candidate.text,
      candidate.frequency,
      toneCaseKey(candidate.toneCase),
      candidate.tone,
      `https://en.wiktionary.org/wiki/${candidate.text}`,
      answers.get(candidate.text) ?? '',
    ]
      .map(csvField)
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\n') + '\n';
}

export interface BuildOptions {
  /** The folder of candidates.json and corpus-check.csv. */
  outDir: string;
  /** Replace candidates.json even though it exists. */
  force: boolean;
  /** The folder of the source lists. */
  sourcesDir?: URL;
}

/**
 * Chooses the candidates and writes both files.
 *
 * @returns how many candidates each level has.
 * @throws if candidates.json exists and `force` is false; nothing is written then.
 */
export function buildCandidates({ outDir, force, sourcesDir = DEFAULT_SOURCES_DIR }: BuildOptions) {
  const candidatesFile = join(outDir, 'candidates.json');
  const csvFile = join(outDir, 'corpus-check.csv');
  if (existsSync(candidatesFile) && !force) {
    throw new Error(
      `${candidatesFile} already exists: the list of candidates is frozen. ` +
        'Run again with --force to replace it.',
    );
  }

  const candidates = selectCandidates(readSources(sourcesDir), validSyllables());
  const level2 = candidates.filter((candidate) => candidate.level === 2);

  // One candidate per line: a new list shows in git as the words that changed.
  const lines = candidates.map((candidate) => `    ${JSON.stringify(candidate)}`).join(',\n');
  const generated = new Date().toISOString().slice(0, 10);
  writeFileSync(
    candidatesFile,
    `{\n  "generated": "${generated}",\n  "candidates": [\n${lines}\n  ]\n}\n`,
  );

  const previousCsv = existsSync(csvFile) ? readFileSync(csvFile, 'utf8') : null;
  writeFileSync(csvFile, mergeCorpusCsv(previousCsv, level2));

  return { level1: candidates.length - level2.length, level2: level2.length };
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { level1, level2 } = buildCandidates({
      outDir: DEFAULT_OUT_DIR,
      force: process.argv.includes('--force'),
    });
    console.log(`Level 1: ${level1} candidates (data/words/candidates.json)`);
    console.log(`Level 2: ${level2} candidates (data/words/corpus-check.csv)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
