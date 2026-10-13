/**
 * Random syllable generator.
 *
 * Drawing a syllable uniformly from every valid one would mostly give low
 * class onsets and stop finals, which are the most numerous. The draw is
 * balanced by category instead: it picks a class first, then a kind of onset,
 * a kind of final, a vowel, a tone mark, and only then the letters.
 *
 * Each step picks among the values the remaining syllables actually have, then
 * keeps only those, so the draw never reaches a dead end.
 *
 * Frequency choices: each step picks one of the values still possible
 * uniformly, whatever the number of syllables behind each value. A rare value
 * therefore comes out as often as a common one at its step. The consequences
 * of each step are spelled out in `generateSyllable`.
 *
 * TODO: draw more often the syllables the player got wrong, grouped by their
 * five answers (two syllables with the same answers need the same reasoning),
 * capped at one syllable in three.
 */
import { TONE_MARK } from '../types';
import { categoryGroups } from './syllables';
import type { Syllable } from './syllables';

export type { Syllable } from './syllables';

/** A source of random numbers in [0, 1), such as `Math.random`. */
export type Rng = () => number;

/**
 * How often a syllable has no tone mark, when it could have one or not.
 * Frequency choice: 40% for a syllable with no mark. Some syllables cannot
 * carry a mark (closed ee and aee), so the overall share is higher, about 44%.
 */
const NO_MARK_PROBABILITY = 0.4;

/**
 * Draws a random syllable, balanced by category.
 *
 * @param rng source of random numbers in [0, 1), such as `Math.random`.
 * @throws if `rng` returns a number outside [0, 1).
 */
export function generateSyllable(rng: Rng): Syllable {
  // The first three steps choose among the category groups, not every syllable.
  const groups = categoryGroups();

  // Frequency choice: each class a third of the time, although low class
  // consonants are the most numerous.
  const byClass = keepOneValue(groups, (g) => g.category.consonantClass, rng);

  // Frequency choice: each kind of onset the class has, equally often. The kinds
  // with few onsets come out often: อย, the only leading อ, starts a third of
  // the mid class syllables (1 in 9 overall), and the 8 leading ห a third of the
  // high class ones.
  const byOnsetKind = keepOneValue(byClass, (g) => g.category.onsetKind, rng);

  // Frequency choice: no final, a sonorant final or a stop final, equally often.
  const [group] = keepOneValue(byOnsetKind, (g) => g.category.finalKind, rng);

  // Frequency choice: each vowel possible in the group, equally often.
  const byVowel = keepOneValue(group.syllables, (s) => s.parts.vowel.id, rng);

  // Frequency choice: no mark 40% of the time (see NO_MARK_PROBABILITY), else
  // each mark allowed, equally often.
  const byMark = keepOneMark(byVowel, rng);

  // Frequency choice: each onset of the kind, equally often.
  const byOnset = keepOneValue(byMark, (s) => s.parts.onset.text, rng);

  // Frequency choice: each final letter, equally often. The sound with the most
  // letters comes out most: among stop finals, /t/ has 16 letters, /p/ 5 and
  // /k/ 4; among sonorant finals, /n/ has 6 letters and the others one each.
  const byFinal = keepOneValue(byOnset, (s) => s.parts.final ?? '', rng);

  // Onset, vowel, final and mark are now all chosen: one syllable is left.
  const [syllable] = byFinal;
  if (byFinal.length !== 1 || syllable === undefined) {
    throw new Error(`Expected one syllable left, got ${byFinal.length}`);
  }
  return syllable;
}

/** Picks one value among those of the items, uniformly, and keeps the items that have it. */
function keepOneValue<T>(items: readonly T[], valueOf: (item: T) => string, rng: Rng): T[] {
  const values = [...new Set(items.map(valueOf))];
  const chosen = pickOne(values, rng);
  return items.filter((item) => valueOf(item) === chosen);
}

/** Keeps the syllables without a tone mark about 40% of the time, else those with one mark. */
function keepOneMark(syllables: readonly Syllable[], rng: Rng): Syllable[] {
  const unmarked = syllables.filter((s) => s.parts.mark === TONE_MARK.None);
  const marked = syllables.filter((s) => s.parts.mark !== TONE_MARK.None);

  const wantsNoMark = randomNumber(rng) < NO_MARK_PROBABILITY;
  if (unmarked.length > 0 && (wantsNoMark || marked.length === 0)) return unmarked;
  return keepOneValue(marked, (s) => s.parts.mark, rng);
}

/** Picks one item uniformly. */
function pickOne<T>(items: readonly T[], rng: Rng): T {
  const index = Math.floor(randomNumber(rng) * items.length);
  const item = items[index];
  if (item === undefined) throw new Error(`Cannot pick among ${items.length} items`);
  return item;
}

/** Calls `rng`, checking that it returns a number in [0, 1). */
function randomNumber(rng: Rng): number {
  const value = rng();
  // Written so that NaN is out of range too.
  const inRange = value >= 0 && value < 1;
  if (!inRange) {
    throw new Error(`rng must return a number in [0, 1), got ${value}`);
  }
  return value;
}
