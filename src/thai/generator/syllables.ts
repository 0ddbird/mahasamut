/**
 * Every syllable the game can show.
 *
 * The combinations of onset, vowel, final and tone mark are few enough to list
 * them all (391,300), keep the valid ones, and compute their text and answers
 * once. The generator then draws from that list, so it can only return a
 * syllable that passed the rules.
 */
import { syllableAnswers } from '../answers';
import type { SyllableAnswers } from '../answers';
import { CONSONANTS } from '../consonants';
import { ONSETS } from '../consonants/onsets';
import { render } from '../render';
import type { SyllableParts } from '../render';
import { checkSyllable } from '../rules';
import { TONE_MARKS } from '../types';
import type { ConsonantClass, FinalKind, OnsetKind } from '../types';
import { VOWELS } from '../vowels';

/** A syllable ready to show: its parts, how it is written, and the expected answers. */
export interface Syllable {
  parts: Required<SyllableParts>;
  text: string;
  answers: SyllableAnswers;
}

/** Every combination of onset, vowel, final (or none) and tone mark (or none), valid or not. */
export function allCombinations(): Required<SyllableParts>[] {
  const finals = [null, ...CONSONANTS.map((c) => c.char)];
  const onsetsWithVowels = ONSETS.flatMap((onset) => VOWELS.map((vowel) => ({ onset, vowel })));
  const withEachFinal = (parts: Pick<SyllableParts, 'onset' | 'vowel'>) =>
    finals.map((final) => ({ ...parts, final }));
  const withFinals = onsetsWithVowels.flatMap(withEachFinal);
  const withEachMark = (parts: Pick<Required<SyllableParts>, 'onset' | 'vowel' | 'final'>) =>
    TONE_MARKS.map((mark) => ({ ...parts, mark }));
  const withMarks = withFinals.flatMap(withEachMark);

  return withMarks;
}

let validSyllablesCache: readonly Syllable[] | null = null;

/** Every valid syllable, computed on the first call only. */
export function validSyllables(): readonly Syllable[] {
  validSyllablesCache ??= allCombinations()
    .filter((parts) => checkSyllable(parts) === null)
    .map((parts) => ({ parts, text: render(parts), answers: syllableAnswers(parts) }));
  return validSyllablesCache;
}

/** What the draw balances first: the class, the kind of onset and the kind of final. */
export interface Category {
  consonantClass: ConsonantClass;
  onsetKind: OnsetKind;
  finalKind: FinalKind;
}

/** The valid syllables of one category. */
export interface CategoryGroup {
  category: Category;
  syllables: readonly Syllable[];
}

let categoryGroupsCache: readonly CategoryGroup[] | null = null;

/**
 * The valid syllables grouped by category, computed on the first call only.
 *
 * There are 24 groups: 8 pairs of class and kind of onset, × 3 kinds of final.
 * Of the 4 kinds of onset (single consonant, cluster, leading ห, leading อ),
 * each class has single consonants and clusters; leading ห only makes high
 * class onsets, and leading อ only mid class ones.
 */
export function categoryGroups(): readonly CategoryGroup[] {
  if (categoryGroupsCache !== null) return categoryGroupsCache;

  const groups = new Map<string, { category: Category; syllables: Syllable[] }>();
  for (const syllable of validSyllables()) {
    const category = {
      consonantClass: syllable.answers.consonantClass,
      onsetKind: syllable.parts.onset.kind,
      finalKind: syllable.answers.finalKind,
    };
    const key = `${category.consonantClass} ${category.onsetKind} ${category.finalKind}`;

    let group = groups.get(key);
    if (group === undefined) {
      group = { category, syllables: [] };
      groups.set(key, group);
    }
    group.syllables.push(syllable);
  }

  categoryGroupsCache = [...groups.values()];
  return categoryGroupsCache;
}
