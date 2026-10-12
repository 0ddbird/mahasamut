/**
 * Validity rules: which combinations of onset, vowel, final and tone mark make
 * a syllable the game can show.
 *
 * `render` writes any combination it can spell. Some of them are not proper
 * Thai spelling, and some could be read in two ways, which would make the
 * expected answers ambiguous for the player. These rules leave them out.
 */
import { canBeFinal } from '../consonants/finals';
import type { SyllableParts } from '../render';
import { CONSONANT_CLASS, TONE_MARK, VOWEL } from '../types';
import type { VowelId } from '../types';

/** A validity rule: `null` if the syllable follows it, otherwise the reason it does not. */
type Rule = (parts: SyllableParts) => string | null;

/** Rule 1: ๊ and ๋ are only written on mid-class consonants (โต๊ะ, ก๋วย). */
function midClassOnlyMarks({ onset, mark = TONE_MARK.None }: SyllableParts): string | null {
  const midClassOnlyMark = mark === TONE_MARK.Trii || mark === TONE_MARK.Djattawaa;
  if (midClassOnlyMark && onset.consonantClass !== CONSONANT_CLASS.Mid) {
    return `Tone mark ${mark} needs a mid class onset, got ${onset.text} (${onset.consonantClass})`;
  }
  return null;
}

/**
 * Rule 2: a final must be a letter that can close a syllable (not ฉ ฌ ผ ฝ ห อ ฮ),
 * after a vowel that takes one (not the open-only vowels nor the sara koen).
 */
function finalAllowed({ vowel, final = null }: SyllableParts): string | null {
  if (final === null) return null;
  if (!canBeFinal(final)) return `Final ${final} cannot end a syllable`;
  if (vowel.closed === null) return `Vowel ${vowel.id} takes no final, got ${final}`;
  return null;
}

/**
 * Vowels a final ย or ว can follow. Together they make a diphthong: สาย, คุย,
 * ลอย, โดย, เลย, สวย, เหนื่อย with ย; ขาว, หิว, เร็ว, เลว, แมว, เขียว with ว.
 *
 * @see https://en.wikipedia.org/wiki/Royal_Thai_General_System_of_Transcription (vowels table)
 */
const VOWELS_BEFORE_SEMIVOWEL: ReadonlyMap<string, readonly VowelId[]> = new Map([
  ['ย', [VOWEL.Aa, VOWEL.U, VOWEL.Uu, VOWEL.Oor, VOWEL.Oo, VOWEL.Oee, VOWEL.Uua, VOWEL.Ueea]],
  ['ว', [VOWEL.Aa, VOWEL.I, VOWEL.E, VOWEL.Ee, VOWEL.Ae, VOWEL.Aee, VOWEL.Iia]],
]);

/**
 * Rule 3: a final ย or ว only follows the vowels it makes a common diphthong
 * with. Short a + /y/ is written ไ- or ใ-, and short a + /w/ is written เ-า.
 */
function semivowelFinals({ vowel, final = null }: SyllableParts): string | null {
  if (final === null) return null;
  const allowedVowels = VOWELS_BEFORE_SEMIVOWEL.get(final);
  if (allowedVowels === undefined || allowedVowels.includes(vowel.id)) return null;
  return `Final ${final} cannot follow vowel ${vowel.id}`;
}

/** The rules, in the order they are checked: the first one broken gives the reason. */
const RULES: readonly Rule[] = [midClassOnlyMarks, finalAllowed, semivowelFinals];

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
