/**
 * The feedback of each answer row of the syllable game, once the answers are
 * checked.
 *
 * For a homograph (เกร: ก + เ- + ร, or กร + เ-), both readings are accepted:
 * the row shows the one closest to the player's answers as expected, and the
 * other as also accepted. The steps a tone mark makes useless are not graded,
 * and show nothing.
 */
import type { RowFeedback } from '../../components/AnswerRow/feedback';
import type { SyllableAnswers } from '../../thai/answers';
import type { CheckResult, GameAnswers, Step } from './check';

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
