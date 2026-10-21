/**
 * The words of the pool: the syllables the game draws from when it shows real
 * Thai words instead of any valid syllable.
 *
 * pool.json is written by `npm run words:pool` from the reviewed candidates
 * (every level 1 word the reviewer did not remove).
 */
import { groupByCategory, validSyllables } from '../generator/syllables';
import type { CategoryGroup, Syllable } from '../generator/syllables';
import pool from './pool.json';

let wordSyllablesCache: readonly Syllable[] | null = null;

/**
 * The valid syllables whose text is in the pool, computed on the first call
 * only. A homograph is kept with every analysis, as in validSyllables().
 */
export function wordSyllables(): readonly Syllable[] {
  if (wordSyllablesCache !== null) return wordSyllablesCache;

  const texts = new Set<string>(pool);
  wordSyllablesCache = validSyllables().filter((syllable) => texts.has(syllable.text));
  return wordSyllablesCache;
}

let wordGroupsCache: readonly CategoryGroup[] | null = null;

/** The pool syllables grouped by category, computed on the first call only. */
export function wordGroups(): readonly CategoryGroup[] {
  wordGroupsCache ??= groupByCategory(wordSyllables());
  return wordGroupsCache;
}
