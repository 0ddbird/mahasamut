/**
 * The recorded sound of each vowel: one file per vowel in public/audio/vowels,
 * named by its id, each saying "สระ" then the vowel on อ, as Thai pupils recite
 * them. scripts/generate-vowel-sounds.mjs makes them.
 */
import { VOWEL, VOWEL_IDS } from '../../thai/types';
import type { VowelId } from '../../thai/types';
import { VOWEL_IPA } from '../../thai/vowels/ipa';

/** Where the sound of a vowel is served. */
export const vowelSoundUrl = (id: VowelId) => `${import.meta.env.BASE_URL}audio/vowels/${id}.mp3`;

/**
 * The vowel whose recording plays for each sound an answer gives: the first
 * vowel with that sound, but ไ for /aj/, since ไอ is a word and ใอ is not.
 */
export const SOUND_VOWEL: ReadonlyMap<string, VowelId> = new Map(
  [VOWEL.AiMalai, ...VOWEL_IDS]
    .map((id) => [VOWEL_IPA[id], id] as const)
    .filter(([sound], index, all) => all.findIndex(([first]) => first === sound) === index),
);
