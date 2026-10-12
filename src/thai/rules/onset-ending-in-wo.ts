/**
 * Rule 5: an onset ending in ว (กว ขว คว หว) takes neither the vowels -ัว and
 * -ัวะ nor the invisible o.
 *
 * Closed, -ัว drops its ั and is written ◌ว (ควร), so the ว of the vowel and
 * the ว of the onset are hard to tell apart: กว + invisible o + น would be
 * written กวน, the spelling of ก + -ัว + น (กวน, หวน). Short -ัวะ doubles the
 * ว the same way (กวัวะ). The single consonant ว is not concerned (วัว, วน).
 *
 * @see https://pickup-thai.com/?p=3011 (ควาย / ควย: the ว of a cluster or of -ัว)
 * @see https://www.thaipod101.com/lesson/thai-alphabet-made-easy-15-the-classchanging-h%C7%8Eaw-hiip-short-ua-and-long-ua
 */
import type { SyllableParts } from '../render';
import { ONSET_KIND, VOWEL } from '../types';

/** Rejects -ัว, -ัวะ and the invisible o after an onset of two letters ending in ว. */
export function onsetEndingInWo({ onset, vowel, final = null }: SyllableParts): string | null {
  const endsInWo = onset.kind !== ONSET_KIND.Single && onset.text.endsWith('ว');
  if (!endsInWo) return null;

  const ua = vowel.id === VOWEL.Ua || vowel.id === VOWEL.Uua;
  // Without a final, o is written โ-ะ and stays readable.
  const invisibleO = vowel.id === VOWEL.O && final !== null;
  if (!ua && !invisibleO) return null;

  return `Onset ${onset.text} ends in ว and cannot take vowel ${vowel.id}`;
}
