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
 * before a final (กัน). They are grouped by that behavior:
 * - regular.ts: same spelling with or without a final;
 * - changing.ts: spelling changes before a final;
 * - open-only.ts: never followed by a final;
 * - sara-koen.ts: end with a built-in final sound (ำ ใ ไ เ-า).
 */
import { VOWEL_IDS } from '../types';
import type { FinalSound, VowelId, VowelLength } from '../types';
import { CHANGING_VOWELS } from './changing';
import { OPEN_ONLY_VOWELS } from './open-only';
import { REGULAR_VOWELS } from './regular';
import { SARA_KOEN_VOWELS } from './sara-koen';

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
  /** Replaces `closed` when the final consonant is ย: เ-อ + ย is written เ◌ย (เลย). */
  closedBeforeY?: string;
  /**
   * Replaces `closed` when a tone mark is written: the ็ of เ◌็ and แ◌็ has
   * to make room for the mark (เล็ก / เล่น).
   */
  closedMarked?: string;
  /** Final sound built into the vowel itself, for sara koen: ำ ends with /m/ (น้ำ). */
  inherentFinal?: FinalSound;
}

export { CHANGING_VOWELS, OPEN_ONLY_VOWELS, REGULAR_VOWELS, SARA_KOEN_VOWELS };

const BY_ID = new Map(
  [...REGULAR_VOWELS, ...CHANGING_VOWELS, ...OPEN_ONLY_VOWELS, ...SARA_KOEN_VOWELS].map((v) => [
    v.id,
    v,
  ]),
);

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

/** All 28 vowels: the 24 simple ones in short/long pairs, then the 4 sara koen. */
export const VOWELS: readonly Vowel[] = VOWEL_IDS.map(vowel);
