/**
 * Thai vowels and how they are written.
 *
 * A Thai vowel is written around its consonant: before it (เ แ โ), above it
 * (ิ ี ึ ื ั), below it (ุ ู), after it (า อ ะ), or several of these at once
 * (เ◌ือ, เ◌ีย). Each vowel is therefore described by a template where the
 * dotted circle ◌ marks the consonant's place, as in Thai textbooks.
 *
 * Vowels come in short/long pairs. Only the 24 simple vowels written without
 * a final consonant are covered here.
 */
import { VOWEL, VOWEL_LENGTH } from './types';
import type { VowelId, VowelLength } from './types';

/** Placeholder for the consonant in a vowel template: the dotted circle U+25CC. */
export const CONSONANT_SLOT = '◌';

export interface Vowel {
  id: VowelId;
  length: VowelLength;
  /** How the vowel is written around its consonant when the syllable has no final. */
  open: string;
}

const SHORT = VOWEL_LENGTH.Short;
const LONG = VOWEL_LENGTH.Long;

/** All 24 simple vowels, each short vowel followed by its long pair. */
export const VOWELS: readonly Vowel[] = [
  { id: VOWEL.A, length: SHORT, open: '◌ะ' },
  { id: VOWEL.Aa, length: LONG, open: '◌า' },
  { id: VOWEL.I, length: SHORT, open: '◌ิ' },
  { id: VOWEL.Ii, length: LONG, open: '◌ี' },
  { id: VOWEL.Ue, length: SHORT, open: '◌ึ' },
  { id: VOWEL.Uee, length: LONG, open: '◌ือ' },
  { id: VOWEL.U, length: SHORT, open: '◌ุ' },
  { id: VOWEL.Uu, length: LONG, open: '◌ู' },
  { id: VOWEL.E, length: SHORT, open: 'เ◌ะ' },
  { id: VOWEL.Ee, length: LONG, open: 'เ◌' },
  { id: VOWEL.Ae, length: SHORT, open: 'แ◌ะ' },
  { id: VOWEL.Aee, length: LONG, open: 'แ◌' },
  { id: VOWEL.O, length: SHORT, open: 'โ◌ะ' },
  { id: VOWEL.Oo, length: LONG, open: 'โ◌' },
  { id: VOWEL.Or, length: SHORT, open: 'เ◌าะ' },
  { id: VOWEL.Oor, length: LONG, open: '◌อ' },
  { id: VOWEL.Oe, length: SHORT, open: 'เ◌อะ' },
  { id: VOWEL.Oee, length: LONG, open: 'เ◌อ' },
  { id: VOWEL.Ia, length: SHORT, open: 'เ◌ียะ' },
  { id: VOWEL.Iia, length: LONG, open: 'เ◌ีย' },
  { id: VOWEL.Uea, length: SHORT, open: 'เ◌ือะ' },
  { id: VOWEL.Ueea, length: LONG, open: 'เ◌ือ' },
  { id: VOWEL.Ua, length: SHORT, open: '◌ัวะ' },
  { id: VOWEL.Uua, length: LONG, open: '◌ัว' },
];

const BY_ID = new Map(VOWELS.map((v) => [v.id, v]));

/**
 * Looks up a vowel by its id.
 *
 * @throws if `id` is not a known vowel.
 */
export function vowel(id: VowelId): Vowel {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown vowel: ${JSON.stringify(id)}`);
  return found;
}
