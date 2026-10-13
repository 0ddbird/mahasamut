/**
 * Validity rules: which combinations of onset, vowel, final and tone mark make
 * a syllable the game can show.
 *
 * `render` writes any combination it can spell. Some of them are not proper
 * Thai spelling, and some could be read in two ways, which would make the
 * expected answers ambiguous for the player. These rules leave them out.
 * Each rule lives in its own file.
 *
 * One kind of double reading is kept on purpose: a final written right after
 * the onset that forms another onset with it (เกร: ก + เ- + ร, or กร + เ-).
 * Both readings exist in real words (แขว, แปล), so the game accepts the answers
 * of either one. There is no rule 6 any more for that reason.
 */
import type { SyllableParts } from '../render';
import { finalAllowed } from './final-allowed';
import { invisibleOFinals } from './invisible-o-finals';
import { markedClosedEeAee } from './marked-closed-ee-aee';
import { midClassOnlyMarks } from './mid-class-only-marks';
import { onsetEndingInWo } from './onset-ending-in-wo';
import { semivowelFinals } from './semivowel-finals';

/** A validity rule: `null` if the syllable follows it, otherwise the reason it does not. */
type Rule = (parts: SyllableParts) => string | null;

/** The rules, in the order they are checked: the first one broken gives the reason. */
const RULES: readonly Rule[] = [
  midClassOnlyMarks,
  finalAllowed,
  semivowelFinals,
  invisibleOFinals,
  onsetEndingInWo,
  markedClosedEeAee,
];

/**
 * Checks whether a syllable can be shown in the game.
 *
 * @returns `null` if the syllable is valid, otherwise the reason it is not.
 * @throws if `final` is not a supported consonant.
 */
export function checkSyllable(parts: SyllableParts): string | null {
  for (const rule of RULES) {
    const reason = rule(parts);
    if (reason !== null) return reason;
  }
  return null;
}
