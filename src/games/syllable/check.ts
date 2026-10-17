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
 */
import type { SyllableAnswers } from '../../thai/answers';
import { TONE_MARK } from '../../thai/types';
import type { ToneMark } from '../../thai/types';

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
  /** The steps graded: three with a tone mark, all six without. */
  graded: readonly Step[];
  /** Whether each graded step is right; the other steps are left out. */
  steps: Partial<Record<Step, boolean>>;
}

/** The steps that count for a syllable written with `mark`. */
export function gradedSteps(mark: ToneMark): readonly Step[] {
  if (mark === TONE_MARK.None) return STEPS;
  return STEPS.filter((step) => !STEPS_SKIPPED_WITH_A_MARK.includes(step));
}

/**
 * Whether the player has answered every step their own choice of mark needs:
 * the class, the mark and the tone once a mark is chosen, all six otherwise.
 */
export function isComplete(answers: PlayerAnswers): boolean {
  if (answers.toneMark === undefined) return false;
  return gradedSteps(answers.toneMark).every((step) => answers[step] !== undefined);
}

/**
 * Checks the player's answers against the analyses of a syllable written with
 * `mark`. Only the steps that count for the syllable's real mark are graded; a
 * graded step left unanswered is wrong.
 *
 * @throws if `analyses` is empty: every valid syllable has at least one.
 */
export function checkAnswers(
  given: PlayerAnswers,
  analyses: readonly SyllableAnswers[],
  mark: ToneMark,
): CheckResult {
  const graded = gradedSteps(mark);
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
