/**
 * How each vowel sounds, in the International Phonetic Alphabet: the one
 * transcription every learner can rely on, whatever their language.
 *
 * The symbols follow the reference description of Thai (Tingsabadh &
 * Abramson, "Thai", Journal of the IPA, 1993). Length is marked with ː on
 * every long vowel, diphthongs included (/ia/, /iːa/), since the sources do not
 * all agree on how to tell those apart. The vowel alone is transcribed, not
 * its syllable: อะ is /a/, without the glottal stop that ends it.
 */
import { VOWEL } from '../types';
import type { VowelId } from '../types';
import { CONSONANT_SLOT } from './index';
import type { Vowel } from './index';

export const VOWEL_IPA: Record<VowelId, string> = {
  [VOWEL.A]: 'a',
  [VOWEL.Aa]: 'aː',
  [VOWEL.I]: 'i',
  [VOWEL.Ii]: 'iː',
  [VOWEL.Ue]: 'ɯ',
  [VOWEL.Uee]: 'ɯː',
  [VOWEL.U]: 'u',
  [VOWEL.Uu]: 'uː',
  [VOWEL.E]: 'e',
  [VOWEL.Ee]: 'eː',
  [VOWEL.Ae]: 'ɛ',
  [VOWEL.Aee]: 'ɛː',
  [VOWEL.O]: 'o',
  [VOWEL.Oo]: 'oː',
  [VOWEL.Or]: 'ɔ',
  [VOWEL.Oor]: 'ɔː',
  [VOWEL.Oe]: 'ɤ',
  [VOWEL.Oee]: 'ɤː',
  [VOWEL.Ia]: 'ia',
  [VOWEL.Iia]: 'iːa',
  [VOWEL.Uea]: 'ɯa',
  [VOWEL.Ueea]: 'ɯːa',
  [VOWEL.Ua]: 'ua',
  [VOWEL.Uua]: 'uːa',
  // Sara koen end with their built-in final; ใ and ไ sound the same.
  [VOWEL.Am]: 'am',
  [VOWEL.AiMuan]: 'aj',
  [VOWEL.AiMalai]: 'aj',
  [VOWEL.Ao]: 'aw',
};

/** How screen readers can say each IPA letter, which they mostly cannot read. */
const SPOKEN_LETTERS: Record<string, string> = {
  ɛ: 'open e',
  ɔ: 'open o',
  ɯ: 'unrounded u',
  ɤ: 'unrounded o',
  j: 'y',
};

/**
 * A sound in IPA named for screen readers: its letters, then its length, as
 * "unrounded u a, long" for /ɯːa/. They often say nothing for ː, which would
 * make /a/ and /aː/ sound alike.
 */
export function spokenIpa(ipa: string): string {
  const letters = [...ipa.replaceAll('ː', '')].map((letter) => SPOKEN_LETTERS[letter] ?? letter);
  return `${letters.join(' ')}, ${ipa.includes('ː') ? 'long' : 'short'}`;
}

/** The silent consonant อ, on which textbooks write a vowel alone. */
const CARRIER = 'อ';

/** A vowel written alone, as textbooks do: on อ, in its open form (อา, เอีย). */
export function vowelOnCarrier(vowel: Vowel): string {
  return vowel.open.replace(CONSONANT_SLOT, CARRIER);
}
