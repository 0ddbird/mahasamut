/**
 * Chooses the real one-syllable words the game can draw, among the spellings
 * the generator writes.
 *
 * Level 1, the sure words: spellings in the dictionary that are common (at
 * least COMMON_FREQUENCY occurrences in the corpus), and every dictionary
 * spelling of a rare tone case. Level 2: spellings of a rare tone case that
 * only the corpus knows, at least CORPUS_FLOOR times; they wait for a check on
 * the web.
 *
 * A tone case is a class, a liveness, a vowel length and a tone mark: what the
 * tone rule looks at. A case is rare when fewer than RARE_CASE_WORDS of its
 * spellings are common dictionary words.
 */
import type { SyllableAnswers } from '../../src/thai/answers';
import type { Syllable } from '../../src/thai/generator/syllables';
import type { ConsonantClass, Liveness, Tone, ToneMark, VowelLength } from '../../src/thai/types';
import { wordId } from './ids';
import type { Sources } from './sources';

/** A word is common from this many occurrences in the corpus. */
export const COMMON_FREQUENCY = 100;
/** A tone case with fewer common dictionary words than this is rare. */
export const RARE_CASE_WORDS = 25;
/** A word only the corpus knows needs at least this many occurrences. */
export const CORPUS_FLOOR = 5;

/** What the tone rule looks at. */
export type ToneCase = {
  consonantClass: ConsonantClass;
  liveness: Liveness;
  vowelLength: VowelLength;
  mark: ToneMark;
};

/** A spelling chosen for the game. */
export interface Candidate {
  text: string;
  /** The stable name of the text, see wordId. */
  id: string;
  level: 1 | 2;
  /** Where the word comes from: level 1 is the dictionary, level 2 the corpus alone. */
  source: 'dictionary' | 'corpus';
  /** Occurrences in the corpus, 0 if absent. */
  frequency: number;
  toneCase: ToneCase;
  tone: Tone;
  /** The analyses of the spelling: two for a homograph, one otherwise. */
  analyses: readonly SyllableAnswers[];
}

/** The tone case as one string, such as `high dead long eek`. */
export function toneCaseKey({ consonantClass, liveness, vowelLength, mark }: ToneCase): string {
  return `${consonantClass} ${liveness} ${vowelLength} ${mark}`;
}

/** The tone case of a syllable (a homograph's own parts, not its other analysis). */
export function toneCaseOf({ parts, answers }: Syllable): ToneCase {
  return {
    consonantClass: answers.consonantClass,
    liveness: answers.liveness,
    vowelLength: answers.vowelLength,
    mark: parts.mark,
  };
}

/** The first syllable of each text: a homograph counts once, under its first parts. */
function syllablesByText(syllables: readonly Syllable[]): Map<string, Syllable> {
  const byText = new Map<string, Syllable>();
  for (const syllable of syllables) {
    if (!byText.has(syllable.text)) byText.set(syllable.text, syllable);
  }
  return byText;
}

/** How many common dictionary words each tone case has (zero included), by tone case key. */
export function commonWordsByToneCase(
  sources: Sources,
  syllables: readonly Syllable[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [text, syllable] of syllablesByText(syllables)) {
    const key = toneCaseKey(toneCaseOf(syllable));
    const isCommon =
      sources.dictionary.has(text) && (sources.frequency.get(text) ?? 0) >= COMMON_FREQUENCY;
    counts.set(key, (counts.get(key) ?? 0) + (isCommon ? 1 : 0));
  }
  return counts;
}

/** Compares by UTF-16 code units, so that the order never depends on a locale. */
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The level 1 and level 2 candidates, by tone case key, then frequency
 * descending, then text.
 */
export function selectCandidates(sources: Sources, syllables: readonly Syllable[]): Candidate[] {
  const commonWords = commonWordsByToneCase(sources, syllables);

  const candidates: Candidate[] = [];
  for (const [text, syllable] of syllablesByText(syllables)) {
    const toneCase = toneCaseOf(syllable);
    const isRare = (commonWords.get(toneCaseKey(toneCase)) ?? 0) < RARE_CASE_WORDS;
    const frequency = sources.frequency.get(text) ?? 0;

    let level: 1 | 2;
    if (sources.dictionary.has(text)) {
      if (frequency < COMMON_FREQUENCY && !isRare) continue;
      level = 1;
    } else {
      if (!isRare || frequency < CORPUS_FLOOR) continue;
      level = 2;
    }

    candidates.push({
      text,
      id: wordId(text),
      level,
      source: level === 1 ? 'dictionary' : 'corpus',
      frequency,
      toneCase,
      tone: syllable.answers.tone,
      analyses: syllable.analyses,
    });
  }

  return candidates.sort(
    (a, b) =>
      compare(toneCaseKey(a.toneCase), toneCaseKey(b.toneCase)) ||
      b.frequency - a.frequency ||
      compare(a.text, b.text),
  );
}
