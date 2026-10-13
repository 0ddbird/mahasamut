/**
 * Checking the player's answers.
 *
 * A syllable usually has one analysis: the five answers of its parts. A
 * homograph such as เกร has two (ก + เ- + ร, or the cluster กร + เ-), and the
 * player is right with either. The answers are compared with the analysis they
 * match best, so that the feedback only points at the steps really wrong.
 */
import type { SyllableAnswers } from '../../thai/answers';

/** One step of the answer, named after the answer it gives. */
export type Step = keyof SyllableAnswers;

/** The answers the player has chosen so far: any step may still be empty. */
export type PlayerAnswers = Partial<SyllableAnswers>;

/** The five steps, in the order the player answers them. */
export const STEPS: readonly Step[] = [
  'consonantClass',
  'vowelLength',
  'finalKind',
  'liveness',
  'tone',
];

/** The outcome of checking a full set of answers. */
export interface CheckResult {
  /** True only if all five steps are right. */
  correct: boolean;
  /** The analysis the answers were compared with: the one they match best. */
  expected: SyllableAnswers;
  /** Whether each step is right. */
  steps: Record<Step, boolean>;
}

/** Whether the player has answered all five steps. */
export function isComplete(answers: PlayerAnswers): answers is SyllableAnswers {
  return STEPS.every((step) => answers[step] !== undefined);
}

/**
 * Checks the player's answers against the analyses of a syllable.
 *
 * @throws if `analyses` is empty: every valid syllable has at least one.
 */
export function checkAnswers(
  given: SyllableAnswers,
  analyses: readonly SyllableAnswers[],
): CheckResult {
  const results = analyses.map((analysis) => compare(given, analysis));

  // The closest analysis has the most steps right; on a tie, the first one wins.
  let closest: CheckResult | undefined;
  for (const result of results) {
    if (closest === undefined || stepsRight(result) > stepsRight(closest)) closest = result;
  }

  if (closest === undefined) throw new Error('The syllable has no analysis to check against');
  return closest;
}

function compare(given: SyllableAnswers, expected: SyllableAnswers): CheckResult {
  const steps: Record<Step, boolean> = {
    consonantClass: given.consonantClass === expected.consonantClass,
    vowelLength: given.vowelLength === expected.vowelLength,
    finalKind: given.finalKind === expected.finalKind,
    liveness: given.liveness === expected.liveness,
    tone: given.tone === expected.tone,
  };
  const correct = STEPS.every((step) => steps[step]);
  return { correct, expected, steps };
}

function stepsRight(result: CheckResult): number {
  return STEPS.filter((step) => result.steps[step]).length;
}
