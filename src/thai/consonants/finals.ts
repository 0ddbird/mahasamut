/**
 * Final consonants.
 *
 * At the end of a syllable, Thai consonants lose most of their distinctions:
 * 35 letters collapse into 8 sounds. ด, ต, ส, ศ, จ, ช… are all pronounced /t/,
 * and ร, ล, ญ, ณ are pronounced /n/. Seven letters never close a syllable:
 * ฉ ฌ ผ ฝ ห อ ฮ.
 *
 * The sound, not the letter, decides the kind of final: k, t, p are stops;
 * m, n, ng, y, w are sonorants. That kind is what makes a syllable live or dead.
 */
import { consonant } from './index';
import { FINAL_KIND, FINAL_SOUND, LIVENESS, VOWEL_LENGTH } from '../types';
import type { FinalKind, FinalSound, Liveness, VowelLength } from '../types';

const SOUND_BY_LETTER: ReadonlyMap<string, FinalSound> = new Map([
  ['ก', FINAL_SOUND.K],
  ['ข', FINAL_SOUND.K],
  ['ค', FINAL_SOUND.K],
  ['ฆ', FINAL_SOUND.K],

  ['จ', FINAL_SOUND.T],
  ['ช', FINAL_SOUND.T],
  ['ซ', FINAL_SOUND.T],
  ['ฎ', FINAL_SOUND.T],
  ['ฏ', FINAL_SOUND.T],
  ['ฐ', FINAL_SOUND.T],
  ['ฑ', FINAL_SOUND.T],
  ['ฒ', FINAL_SOUND.T],
  ['ด', FINAL_SOUND.T],
  ['ต', FINAL_SOUND.T],
  ['ถ', FINAL_SOUND.T],
  ['ท', FINAL_SOUND.T],
  ['ธ', FINAL_SOUND.T],
  ['ศ', FINAL_SOUND.T],
  ['ษ', FINAL_SOUND.T],
  ['ส', FINAL_SOUND.T],

  ['บ', FINAL_SOUND.P],
  ['ป', FINAL_SOUND.P],
  ['พ', FINAL_SOUND.P],
  ['ฟ', FINAL_SOUND.P],
  ['ภ', FINAL_SOUND.P],

  ['ม', FINAL_SOUND.M],

  ['น', FINAL_SOUND.N],
  ['ญ', FINAL_SOUND.N],
  ['ณ', FINAL_SOUND.N],
  ['ร', FINAL_SOUND.N],
  ['ล', FINAL_SOUND.N],
  ['ฬ', FINAL_SOUND.N],

  ['ง', FINAL_SOUND.Ng],
  ['ย', FINAL_SOUND.Y],
  ['ว', FINAL_SOUND.W],
]);

const STOP_SOUNDS: readonly FinalSound[] = [FINAL_SOUND.K, FINAL_SOUND.T, FINAL_SOUND.P];

/**
 * Whether a consonant letter can close a syllable. Seven letters cannot:
 * ฉ ฌ ผ ฝ ห อ ฮ.
 *
 * @throws if `letter` is not a supported consonant.
 */
export function canBeFinal(letter: string): boolean {
  consonant(letter);
  return SOUND_BY_LETTER.has(letter);
}

/**
 * Returns the sound a consonant letter takes at the end of a syllable.
 *
 * @throws if `letter` is not a supported consonant, or is one of the seven
 *   letters that cannot close a syllable (ฉ ฌ ผ ฝ ห อ ฮ).
 */
export function finalSound(letter: string): FinalSound {
  consonant(letter);
  const sound = SOUND_BY_LETTER.get(letter);
  if (!sound) throw new Error(`${letter} cannot be a final consonant`);
  return sound;
}

/** Kind of final for a final sound; `null` means the syllable has no final sound. */
export function finalKind(sound: FinalSound | null): FinalKind {
  if (sound === null) return FINAL_KIND.None;
  return STOP_SOUNDS.includes(sound) ? FINAL_KIND.Stop : FINAL_KIND.Sonorant;
}

/**
 * Whether a syllable is live or dead. The final decides first: a sonorant
 * final makes it live and a stop final makes it dead, whatever the vowel.
 * Only without a final does the vowel length decide: long is live, short is dead.
 */
export function liveness(kind: FinalKind, length: VowelLength): Liveness {
  if (kind === FINAL_KIND.Sonorant) return LIVENESS.Live;
  if (kind === FINAL_KIND.Stop) return LIVENESS.Dead;
  return length === VOWEL_LENGTH.Long ? LIVENESS.Live : LIVENESS.Dead;
}
