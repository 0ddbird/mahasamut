/** The word lists the candidates are chosen from (see data/words/sources/README.md). */
import { readFileSync } from 'node:fs';

export interface Sources {
  /** The dictionary: words written by hand, with no frequency. */
  dictionary: ReadonlySet<string>;
  /** How often each form occurs in the Thai National Corpus. */
  frequency: ReadonlyMap<string, number>;
}

/** The trimmed lines of a file, without blank lines and `#` comment lines. */
function dataLines(file: URL): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/**
 * Reads the two lists from a directory (a URL ending in a slash). A form
 * that appears on several lines of the frequency list gets the sum of its counts.
 */
export function readSources(dir: URL): Sources {
  const frequency = new Map<string, number>();
  for (const line of dataLines(new URL('tnc_freq.txt', dir))) {
    const [word, count] = line.split('\t');
    if (word === undefined || count === undefined) continue;
    frequency.set(word, (frequency.get(word) ?? 0) + Number(count));
  }

  return {
    dictionary: new Set(dataLines(new URL('words_th.txt', dir))),
    frequency,
  };
}
