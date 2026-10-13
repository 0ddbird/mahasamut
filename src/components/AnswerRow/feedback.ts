/**
 * What each choice of an answer row shows once the answers are checked.
 *
 * The player sees whether their choice is right or wrong and, when it is
 * wrong, which choice was expected. When more than one answer is accepted
 * (the two readings of a homograph), the others are shown too, as also
 * accepted.
 */

/** The states a choice can show after checking. */
export const OPTION_FEEDBACK = {
  /** The player's choice, and it is right. */
  Right: 'right',
  /** The player's choice, and it is wrong. */
  Wrong: 'wrong',
  /** Not chosen, but it is the answer the player was compared with. */
  Expected: 'expected',
  /** Not chosen, and not expected, but accepted too. */
  AlsoAccepted: 'alsoAccepted',
  /** Nothing to show. */
  None: 'none',
} as const;
export type OptionFeedback = (typeof OPTION_FEEDBACK)[keyof typeof OPTION_FEEDBACK];

/** What a row needs to tell each of its choices how to look. */
export interface RowFeedback<T extends string> {
  /** The player's choice, if they answered the step. */
  chosen?: T;
  /** The answer the player is compared with. */
  expected: T;
  /** Every answer accepted as right, each value once; `expected` is one of them. */
  accepted: readonly T[];
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
