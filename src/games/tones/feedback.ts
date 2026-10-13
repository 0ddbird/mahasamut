/**
 * What each choice of an answer row shows once the answers are checked.
 *
 * The player sees whether their choice is right or wrong and, when it is
 * wrong, which choice was expected. For a homograph (เกร: ก + เ- + ร, or
 * กร + เ-), the other reading's choice is shown too, as also accepted. The
 * steps a tone mark makes useless are not graded, and show nothing.
 */
import type { SyllableAnswers } from '../../thai/answers';
import type { CheckResult, GameAnswers, Step } from './check';

/** The states a choice can show after checking. */
export const OPTION_FEEDBACK = {
  /** The player's choice, and it is right. */
  Right: 'right',
  /** The player's choice, and it is wrong. */
  Wrong: 'wrong',
  /** Not chosen, but it is the answer of the closest analysis. */
  Expected: 'expected',
  /** Not chosen, and not expected, but another analysis of the text gives it. */
  AlsoAccepted: 'alsoAccepted',
  /** Nothing to show. */
  None: 'none',
} as const;
export type OptionFeedback = (typeof OPTION_FEEDBACK)[keyof typeof OPTION_FEEDBACK];

/** What a row needs to tell each of its choices how to look. */
export interface RowFeedback<T extends string> {
  /** The player's choice, if they answered the step. */
  chosen?: T;
  /** The answer of the closest analysis. */
  expected: T;
  /** The answer of every analysis of the text, each value once. */
  accepted: readonly T[];
}

/**
 * Gathers the feedback of one row from the result of the check.
 *
 * @returns `undefined` for a step that is not graded: the row shows nothing.
 */
export function rowFeedback<K extends Step>(
  step: K,
  result: CheckResult,
  analyses: readonly SyllableAnswers[],
): RowFeedback<GameAnswers[K]> | undefined {
  if (!result.graded.includes(step)) return undefined;

  // Every analysis of a text has the same tone mark: the text is the same.
  const withMark = analyses.map((analysis) => ({
    ...analysis,
    toneMark: result.expected.toneMark,
  }));
  const accepted = [...new Set(withMark.map((analysis) => analysis[step]))];
  return { chosen: result.given[step], expected: result.expected[step], accepted };
}

/** The state of one choice of a row. */
export function optionFeedback<T extends string>(value: T, row: RowFeedback<T>): OptionFeedback {
  if (value === row.chosen) {
    return value === row.expected ? OPTION_FEEDBACK.Right : OPTION_FEEDBACK.Wrong;
  }
  if (value === row.expected) return OPTION_FEEDBACK.Expected;
  if (row.accepted.includes(value)) return OPTION_FEEDBACK.AlsoAccepted;
  return OPTION_FEEDBACK.None;
}
