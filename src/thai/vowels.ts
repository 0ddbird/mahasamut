/**
 * Thai vowels and how they are written.
 *
 * A Thai vowel is written around its consonant: before it (เ แ โ), above it
 * (ิ ี ึ ื ั), below it (ุ ู), after it (า อ ะ), or several of these at once
 * (เ◌ือ, เ◌ีย). Each vowel is therefore described by a template where the
 * dotted circle ◌ marks the consonant's place, as in Thai textbooks.
 *
 * Vowels come in short/long pairs, and may be written differently when a
 * final consonant follows: short a is ◌ะ in an open syllable (กะ) but ◌ั
 * before a final (กัน). Some vowels never take a final consonant.
 */
import { VOWEL, VOWEL_LENGTH } from './types';
import type { VowelId, VowelLength } from './types';

/** Placeholder for the consonant in a vowel template: the dotted circle ◌. */
export const CONSONANT_SLOT = String.fromCodePoint(0x25cc);

/**
 * Vowel signs written above or below the consonant.
 *
 * @see docs/thai_unicode_chart.pdf (Unicode chart for the Thai block, U+0E00–U+0E7F)
 */
export const VOWEL_SIGNS_ON_CONSONANT: readonly string[] = [
  String.fromCodePoint(0x0e31), // ั
  String.fromCodePoint(0x0e34), // ิ
  String.fromCodePoint(0x0e35), // ี
  String.fromCodePoint(0x0e36), // ึ
  String.fromCodePoint(0x0e37), // ื
  String.fromCodePoint(0x0e38), // ุ
  String.fromCodePoint(0x0e39), // ู
];

export interface Vowel {
  id: VowelId;
  length: VowelLength;
  /** How the vowel is written around its consonant when the syllable has no final. */
  open: string;
  /**
   * How the vowel is written before a final consonant, which goes right after
   * it; `null` if the vowel cannot take a final consonant.
   */
  closed: string | null;
}

const SHORT = VOWEL_LENGTH.Short;
const LONG = VOWEL_LENGTH.Long;

/** All 24 simple vowels, each short vowel followed by its long pair. */
export const VOWELS: readonly Vowel[] = [
  { id: VOWEL.A, length: SHORT, open: '◌ะ', closed: '◌ั' },
  { id: VOWEL.Aa, length: LONG, open: '◌า', closed: '◌า' },
  { id: VOWEL.I, length: SHORT, open: '◌ิ', closed: '◌ิ' },
  { id: VOWEL.Ii, length: LONG, open: '◌ี', closed: '◌ี' },
  { id: VOWEL.Ue, length: SHORT, open: '◌ึ', closed: '◌ึ' },
  { id: VOWEL.Uee, length: LONG, open: '◌ือ', closed: null }, // TODO: ◌ื before a final (มืด)
  { id: VOWEL.U, length: SHORT, open: '◌ุ', closed: '◌ุ' },
  { id: VOWEL.Uu, length: LONG, open: '◌ู', closed: '◌ู' },
  { id: VOWEL.E, length: SHORT, open: 'เ◌ะ', closed: null }, // TODO: เ◌็, without ็ when marked (เล็ก, เล่น)
  { id: VOWEL.Ee, length: LONG, open: 'เ◌', closed: 'เ◌' },
  { id: VOWEL.Ae, length: SHORT, open: 'แ◌ะ', closed: null }, // TODO: แ◌็, without ็ when marked (แข็ง, แข่ง)
  { id: VOWEL.Aee, length: LONG, open: 'แ◌', closed: 'แ◌' },
  { id: VOWEL.O, length: SHORT, open: 'โ◌ะ', closed: null }, // TODO: invisible before a final (คน)
  { id: VOWEL.Oo, length: LONG, open: 'โ◌', closed: 'โ◌' },
  { id: VOWEL.Or, length: SHORT, open: 'เ◌าะ', closed: null },
  { id: VOWEL.Oor, length: LONG, open: '◌อ', closed: '◌อ' },
  { id: VOWEL.Oe, length: SHORT, open: 'เ◌อะ', closed: null },
  { id: VOWEL.Oee, length: LONG, open: 'เ◌อ', closed: null }, // TODO: เ◌ิ, or เ◌ย with final ย (เดิน, เลย)
  { id: VOWEL.Ia, length: SHORT, open: 'เ◌ียะ', closed: null },
  { id: VOWEL.Iia, length: LONG, open: 'เ◌ีย', closed: 'เ◌ีย' },
  { id: VOWEL.Uea, length: SHORT, open: 'เ◌ือะ', closed: null },
  { id: VOWEL.Ueea, length: LONG, open: 'เ◌ือ', closed: 'เ◌ือ' },
  { id: VOWEL.Ua, length: SHORT, open: '◌ัวะ', closed: null },
  { id: VOWEL.Uua, length: LONG, open: '◌ัว', closed: null }, // TODO: ◌ว before a final (ควร)
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
