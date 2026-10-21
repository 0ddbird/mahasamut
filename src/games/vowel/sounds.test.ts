/// <reference types="node" />
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VOWEL, VOWEL_IDS } from '../../thai/types';
import { VOWEL_IPA } from '../../thai/vowels/ipa';
import { SOUND_VOWEL, vowelSoundUrl } from './sounds';

describe('vowelSoundUrl', () => {
  it('serves each vowel from its own file', () => {
    expect(vowelSoundUrl(VOWEL.Aa)).toBe('/audio/vowels/aa.mp3');
  });

  it('has a recorded file for every vowel', () => {
    const missing = VOWEL_IDS.filter(
      (id) => !existsSync(new URL(`../../../public/audio/vowels/${id}.mp3`, import.meta.url)),
    );
    expect(missing).toEqual([]);
  });
});

describe('SOUND_VOWEL', () => {
  it('reads every sound from a vowel that has it', () => {
    const sounds = new Set(VOWEL_IDS.map((id) => VOWEL_IPA[id]));
    expect(SOUND_VOWEL.size).toBe(sounds.size);
    for (const [sound, id] of SOUND_VOWEL) expect(VOWEL_IPA[id]).toBe(sound);
  });

  // ใอ is no word, ไอ is one ("to cough"): its recording is the surer one.
  it('reads /aj/ from ไ', () => {
    expect(SOUND_VOWEL.get('aj')).toBe(VOWEL.AiMalai);
  });
});
