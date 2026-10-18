import { describe, expect, it } from 'vitest';
import { CONSONANTS } from '../thai/consonants';
import { VOWELS } from '../thai/vowels';
import { CONSONANTS_HELP, TONES_HELP, VOWELS_HELP } from './index';

/** The cells of the Markdown table rows that start with `|`, without the header. */
const tableRows = (markdown: string) =>
  markdown
    .split('\n')
    .filter(
      (line) => line.startsWith('|') && !line.startsWith('| :') && !/^\|\s*Mid\s*\|/.test(line),
    )
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );

describe('the help pages', () => {
  it('are all written', () => {
    for (const page of [CONSONANTS_HELP, VOWELS_HELP, TONES_HELP])
      expect(page.length).toBeGreaterThan(100);
  });

  it('put every consonant of the game in the column of its class', () => {
    const COLUMNS = ['mid', 'high', 'low', 'low'];
    const classOf = new Map<string, string>();
    for (const row of tableRows(CONSONANTS_HELP)) {
      row.forEach((cell, column) => {
        for (const char of cell.split(' ')) classOf.set(char, COLUMNS[column] ?? '');
      });
    }
    for (const consonant of CONSONANTS) {
      expect(classOf.get(consonant.char), consonant.char).toBe(consonant.consonantClass);
    }
  });

  it('shows every vowel of the game', () => {
    for (const vowel of VOWELS) expect(VOWELS_HELP, vowel.id).toContain(vowel.open);
  });
});
