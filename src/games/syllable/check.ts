/**
 * Checking the player's answers.
 *
 * The game asks six steps: the five answers of the syllable, plus its tone
 * mark. Once a tone mark is written, the Thai tone rule only looks at the class
 * and the mark: the vowel length, the final and whether the syllable is live
 * or dead no longer matter. Those three steps are then not graded.
 *
 * A syllable usually has one analysis: the five answers of its parts. A
 * homograph such as เกร has two (ก + เ- + ร, or the cluster กร + เ-), and the
 * player is right with either. The answers are compared with the analysis they
 * match best, so that the feedback only points at the steps really wrong.
 *
 * In tone-only mode, the player gives the tone alone, and only the tone is
 * graded. Every reading of a homograph has the same tone, so the reading
 * compared with does not matter then.
 */
import type { SyllableAnswers } from '../../thai/answers';
import { TONE_MARK } from '../../thai/types';
import type { ToneMark } from '../../thai/types';
import { ANSWER_MODE } from '../shared/settings';
import type { AnswerMode } from '../shared/settings';

/** What the game asks: the five answers of the syllable, plus its tone mark. */
export interface GameAnswers extends SyllableAnswers {
  toneMark: ToneMark;
}

/** One step of the answer, named after the answer it gives. */
export type Step = keyof GameAnswers;

/** The answers the player has chosen so far: any step may still be empty. */
export type PlayerAnswers = Partial<GameAnswers>;

/** The six steps, in the order the player answers them. */
export const STEPS: readonly Step[] = [
  'consonantClass',
  'toneMark',
  'vowelLength',
  'finalKind',
  'liveness',
  'tone',
];

/** The steps a tone mark makes useless: the tone no longer depends on them. */
const STEPS_SKIPPED_WITH_A_MARK: readonly Step[] = ['vowelLength', 'finalKind', 'liveness'];

/** The outcome of checking the answers. */
export interface CheckResult {
  /** The player's answers, as checked. */
  given: PlayerAnswers;
  /** True only if every graded step is right. */
  correct: boolean;
  /** The analysis the answers were compared with (the closest), with the syllable's mark. */
  expected: GameAnswers;
  /** The steps graded: three with a tone mark, all six without, the tone alone in tone-only mode. */
  graded: readonly Step[];
  /** Whether each graded step is right; the other steps are left out. */
  steps: Partial<Record<Step, boolean>>;
}

/** The only step graded in tone-only mode. */
const TONE_ONLY: readonly Step[] = ['tone'];

/** The steps that count for a syllable written with `mark`, when answering in `mode`. */
export function gradedSteps(
  mark: ToneMark,
  mode: AnswerMode = ANSWER_MODE.Detailed,
): readonly Step[] {
  if (mode === ANSWER_MODE.ToneOnly) return TONE_ONLY;
  if (mark === TONE_MARK.None) return STEPS;
  return STEPS.filter((step) => !STEPS_SKIPPED_WITH_A_MARK.includes(step));
}

/**
 * Whether the player has answered every step their own choice of mark needs:
 * the class, the mark and the tone once a mark is chosen, all six otherwise.
 * In tone-only mode, the tone alone is enough.
 */
export function isComplete(
  answers: PlayerAnswers,
  mode: AnswerMode = ANSWER_MODE.Detailed,
): boolean {
  if (mode === ANSWER_MODE.ToneOnly) return answers.tone !== undefined;
  if (answers.toneMark === undefined) return false;
  return gradedSteps(answers.toneMark).every((step) => answers[step] !== undefined);
}

/**
 * Checks the player's answers against the analyses of a syllable written with
 * `mark`. Only the steps that count for the syllable's real mark, in `mode`,
 * are graded; a graded step left unanswered is wrong.
 *
 * @throws if `analyses` is empty: every valid syllable has at least one.
 */
export function checkAnswers(
  given: PlayerAnswers,
  analyses: readonly SyllableAnswers[],
  mark: ToneMark,
  mode: AnswerMode = ANSWER_MODE.Detailed,
): CheckResult {
  const graded = gradedSteps(mark, mode);
  const results = analyses.map((analysis) =>
    compare(given, { ...analysis, toneMark: mark }, graded),
  );

  // The closest analysis has the most steps right; on a tie, the first one wins.
  let closest: CheckResult | undefined;
  for (const result of results) {
    if (closest === undefined || stepsRight(result) > stepsRight(closest)) closest = result;
  }

  if (closest === undefined) throw new Error('The syllable has no analysis to check against');
  return closest;
}

function compare(
  given: PlayerAnswers,
  expected: GameAnswers,
  graded: readonly Step[],
): CheckResult {
  const steps: Partial<Record<Step, boolean>> = {};
  for (const step of graded) steps[step] = given[step] === expected[step];

  const correct = graded.every((step) => steps[step]);
  return { given, correct, expected, graded, steps };
}

function stepsRight(result: CheckResult): number {
  return result.graded.filter((step) => result.steps[step]).length;
}
