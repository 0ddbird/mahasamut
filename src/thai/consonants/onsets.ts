/**
 * Onsets: how a syllable starts.
 *
 * Most syllables start with a single consonant, but some start with two:
 * - a cluster (กร, ปล, ขว…), which takes the class of its first consonant;
 * - ห นำ, a silent ห before a low sonorant (หม, หน…), which makes it high class;
 * - อ นำ, a silent อ before ย (อย), which makes it mid class.
 *
 * The class that counts for the tone is this effective class. The tone mark
 * is written on the last consonant of the onset (ปล่อย, หน้า, อย่า).
 *
 * False clusters (ทร, จร, ศร, สร…), read as a single sound, and clusters from
 * loanwords (ฟร, บร, ดร…) are left out.
 */
import { CONSONANT_CLASS, ONSET_KIND } from '../types';
import type { ConsonantClass, OnsetKind } from '../types';
import { CONSONANTS } from './index';

export interface Onset {
  /** The onset as written, e.g. 'ก', 'ปล', 'หน'. */
  text: string;
  kind: OnsetKind;
  /** Effective class, the one used by the tone rules. */
  consonantClass: ConsonantClass;
}

const SINGLES: readonly Onset[] = CONSONANTS.map((c) => ({
  text: c.char,
  kind: ONSET_KIND.Single,
  consonantClass: c.consonantClass,
}));

const CLUSTERS: readonly Onset[] = [
  { text: 'กร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'กล', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'กว', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'ขร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.High },
  { text: 'ขล', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.High },
  { text: 'ขว', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.High },
  { text: 'คร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Low },
  { text: 'คล', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Low },
  { text: 'คว', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Low },
  { text: 'ตร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'ปร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'ปล', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Mid },
  { text: 'พร', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Low },
  { text: 'พล', kind: ONSET_KIND.Cluster, consonantClass: CONSONANT_CLASS.Low },
];

const LEADING_HO: readonly Onset[] = [
  { text: 'หง', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หญ', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หน', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หม', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หย', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หร', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หล', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
  { text: 'หว', kind: ONSET_KIND.LeadingHo, consonantClass: CONSONANT_CLASS.High },
];

const LEADING_O: readonly Onset[] = [
  { text: 'อย', kind: ONSET_KIND.LeadingO, consonantClass: CONSONANT_CLASS.Mid },
];

/** All 65 supported onsets: singles, clusters, leading ห, leading อ. */
export const ONSETS: readonly Onset[] = [...SINGLES, ...CLUSTERS, ...LEADING_HO, ...LEADING_O];

const BY_TEXT = new Map(ONSETS.map((o) => [o.text, o]));

/**
 * Looks up an onset by how it is written.
 *
 * @throws if `text` is not one of the supported onsets.
 */
export function onset(text: string): Onset {
  const found = BY_TEXT.get(text);
  if (!found) throw new Error(`Unknown onset: ${JSON.stringify(text)}`);
  return found;
}
