/**
 * The answers offered for a vowel: its sound, and three others to tell it from.
 *
 * The vowel of the other length always comes among them when there is one
 * (/a/ against /aː/): length is what learners miss most, and the written forms
 * of a pair are close. The others are drawn at random. Every answer is a sound,
 * not a letter, and no sound comes twice: ใ and ไ both sound /aj/.
 */
import type { Rng } from '../../thai/generator';
import { VOWEL, VOWEL_IDS } from '../../thai/types';
import type { VowelId } from '../../thai/types';
import type { Vowel } from '../../thai/vowels';
import { VOWEL_IPA } from '../../thai/vowels/ipa';
import { shuffle } from '../shared/deck';

/** How many answers each question offers. */
export const CHOICE_COUNT = 4;

/** The short and long vowels of each pair. */
const PAIRS: readonly [short: VowelId, long: VowelId][] = [
  [VOWEL.A, VOWEL.Aa],
  [VOWEL.I, VOWEL.Ii],
  [VOWEL.Ue, VOWEL.Uee],
  [VOWEL.U, VOWEL.Uu],
  [VOWEL.E, VOWEL.Ee],
  [VOWEL.Ae, VOWEL.Aee],
  [VOWEL.O, VOWEL.Oo],
  [VOWEL.Or, VOWEL.Oor],
  [VOWEL.Oe, VOWEL.Oee],
  [VOWEL.Ia, VOWEL.Iia],
  [VOWEL.Uea, VOWEL.Ueea],
  [VOWEL.Ua, VOWEL.Uua],
];

/** The vowel of the other length, both ways; the sara koen have none. */
export const LENGTH_PARTNER: Partial<Record<VowelId, VowelId>> = Object.fromEntries(
  PAIRS.flatMap(([short, long]) => [
    [short, long],
    [long, short],
  ]),
);

/** Every vowel sound once. */
const SOUNDS: readonly string[] = [...new Set(VOWEL_IDS.map((id) => VOWEL_IPA[id]))];

/** The answers for `vowel`, in IPA, shuffled: its sound and three others. */
export function vowelChoices(vowel: Vowel, rng: Rng): string[] {
  const answer = VOWEL_IPA[vowel.id];
  const partner = LENGTH_PARTNER[vowel.id];
  const chosen = partner === undefined ? [answer] : [answer, VOWEL_IPA[partner]];
  const others = shuffle(
    SOUNDS.filter((sound) => !chosen.includes(sound)),
    rng,
  );
  return shuffle([...chosen, ...others.slice(0, CHOICE_COUNT - chosen.length)], rng);
}
