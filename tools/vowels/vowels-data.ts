/**
 * Metadata for all 28 Thai vowels in Mahasamut, used by the vowel takes and review tools.
 */
import { VOWEL_IDS } from '../../src/thai/types';
import type { VowelId, VowelLength } from '../../src/thai/types';
import { vowel } from '../../src/thai/vowels';
import { vowelOnCarrier, VOWEL_IPA } from '../../src/thai/vowels/ipa';

export interface VowelItem {
  id: VowelId;
  /** Vowel on silent carrier อ, e.g. "อะ" */
  carrier: string;
  /** Full text recited to Google TTS, e.g. "สระ อะ" */
  text: string;
  /** IPA representation without tone, e.g. "a" */
  ipa: string;
  /** Template representation with dotted circle, e.g. "◌ะ" */
  open: string;
  length: VowelLength;
  /** Index of pair (0..11) for 24 simple vowels, 12 for sara koen */
  pairIndex: number;
  /** True for the first vowel of a short/long pair */
  isPairStart: boolean;
}

export const VOWELS_LIST: readonly VowelItem[] = VOWEL_IDS.map((id, index) => {
  const v = vowel(id);
  const carrier = vowelOnCarrier(v);
  const pairIndex = index < 24 ? Math.floor(index / 2) : 12;
  const isPairStart = index < 24 ? index % 2 === 0 : false;
  return {
    id,
    carrier,
    text: `สระ ${carrier}`,
    ipa: VOWEL_IPA[id],
    open: v.open,
    length: v.length,
    pairIndex,
    isPairStart,
  };
});

export const VOWELS_BY_ID = new Map<VowelId, VowelItem>(VOWELS_LIST.map((item) => [item.id, item]));
