/**
 * The recap of a finished game: one line per question, with the answer the
 * player gave and the right one. The lines are built here, with the labels the
 * games show on their buttons, so that the solo and the multiplayer screens
 * list them the same way.
 */
import type { Option } from '../../components/AnswerRow/option';
import type { ConsonantClass, Tone, VowelId } from '../../thai/types';
import { spokenIpa, VOWEL_IPA } from '../../thai/vowels/ipa';
import { vowelSoundUrl } from '../vowel/sounds';
import { GAME } from './games';
import type { GameId } from './games';
import { CONSONANT_CLASS_OPTIONS, TONE_OPTIONS } from './options';

export type RecapResult = 'right' | 'wrong' | 'timeUp';

/** One question of a finished game, ready to show. */
export interface RecapEntry {
  game: GameId;
  /** Names the question for good: the vowel's id, the consonant, the word. The Report button will group by it. */
  questionId: string;
  /** The Thai text shown during the question. */
  text: string;
  result: RecapResult;
  /** The label of the player's answer; null when the time ran out. */
  given: string | null;
  /** The label of the right answer. */
  expected: string;
  /**
   * What screen readers say instead of `given`, for a label they would read
   * badly (IPA); absent when the label reads well as it is.
   */
  spokenGiven?: string;
  /** What screen readers say instead of `expected`; see `spokenGiven`. */
  spokenExpected?: string;
  /** The sound of the question, or null. */
  sound: string | null;
}

/** A vowel sound as the games write it: in IPA, between slashes. */
const vowelSoundLabel = (sound: string) => `/${sound}/`;

/** The label the answer row shows for a value. */
const labelOf = <T extends string>(options: readonly Option<T>[], value: T): string => {
  const option = options.find((candidate) => candidate.value === value);
  if (!option) throw new Error(`No option for "${value}"`);
  return option.label;
};

/**
 * The line of a vowel question. `given` is the sound chosen, as the game gets
 * it from its answer row (IPA without slashes). Nothing was chosen when the
 * time ran out, whatever the player had picked before. Screen readers get the
 * spoken form of the sounds, as in the answer row: they often say nothing for
 * the length mark, which would make /a/ and /aː/ sound alike.
 */
export function vowelEntry(
  vowelId: VowelId,
  text: string,
  given: string | null,
  result: RecapResult,
): RecapEntry {
  const expected = VOWEL_IPA[vowelId];
  const answered = result !== 'timeUp' && given !== null;
  return {
    game: GAME.Vowel,
    questionId: vowelId,
    text,
    result,
    given: answered ? vowelSoundLabel(given) : null,
    expected: vowelSoundLabel(expected),
    ...(answered && { spokenGiven: spokenIpa(given) }),
    spokenExpected: spokenIpa(expected),
    sound: vowelSoundUrl(vowelId),
  };
}

/** The line of a consonant class question: the consonant names it, and it has no sound. */
export function consonantClassEntry(
  consonant: string,
  expected: ConsonantClass,
  given: ConsonantClass | null,
  result: RecapResult,
): RecapEntry {
  return {
    game: GAME.ConsonantClass,
    questionId: consonant,
    text: consonant,
    result,
    given: result === 'timeUp' || given === null ? null : labelOf(CONSONANT_CLASS_OPTIONS, given),
    expected: labelOf(CONSONANT_CLASS_OPTIONS, expected),
    sound: null,
  };
}

/** The line of a syllable question: the word names it, and `sound` is its recording, if it has one. */
export function syllableEntry(
  text: string,
  expected: Tone,
  given: Tone | null,
  result: RecapResult,
  sound: string | null,
): RecapEntry {
  return {
    game: GAME.Syllable,
    questionId: text,
    text,
    result,
    given: result === 'timeUp' || given === null ? null : labelOf(TONE_OPTIONS, given),
    expected: labelOf(TONE_OPTIONS, expected),
    sound,
  };
}
