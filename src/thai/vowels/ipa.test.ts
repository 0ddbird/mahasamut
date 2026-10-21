import { describe, expect, it } from 'vitest';
import { VOWEL, VOWEL_IDS, VOWEL_LENGTH } from '../types';
import { vowel, VOWELS } from './index';
import { spokenIpa, VOWEL_IPA, vowelOnCarrier } from './ipa';

describe('VOWEL_IPA', () => {
  it('transcribes every vowel', () => {
    for (const id of VOWEL_IDS) expect(VOWEL_IPA[id]).toMatch(/\S/);
  });

  it.each([
    [VOWEL.Aa, 'aː'],
    [VOWEL.Oee, 'ɤː'],
    [VOWEL.Ueea, 'ɯːa'],
    [VOWEL.Or, 'ɔ'],
    [VOWEL.Am, 'am'],
    [VOWEL.Ao, 'aw'],
  ])('transcribes %s as /%s/', (id, ipa) => {
    expect(VOWEL_IPA[id]).toBe(ipa);
  });

  it('gives every vowel its own sound, but ใ and ไ', () => {
    const bySound = new Map<string, string[]>();
    for (const id of VOWEL_IDS)
      bySound.set(VOWEL_IPA[id], [...(bySound.get(VOWEL_IPA[id]) ?? []), id]);
    const shared = [...bySound.values()].filter((ids) => ids.length > 1);
    expect(shared).toEqual([[VOWEL.AiMuan, VOWEL.AiMalai]]);
  });

  it('marks length with ː, on long vowels only', () => {
    // Sara koen are short vowels with a built-in final: no ː either.
    for (const v of VOWELS) {
      expect(VOWEL_IPA[v.id].includes('ː')).toBe(v.length === VOWEL_LENGTH.Long);
    }
  });
});

describe('spokenIpa', () => {
  it.each([
    ['aː', 'a, long'],
    ['ɛ', 'open e, short'],
    ['ɯːa', 'unrounded u a, long'],
    ['aj', 'a y, short'],
  ])('names /%s/ "%s" for screen readers', (ipa, spoken) => {
    expect(spokenIpa(ipa)).toBe(spoken);
  });

  // Screen readers say little for ɯ or ː: the names must still tell every sound apart.
  it('gives every sound its own name', () => {
    const sounds = [...new Set(VOWEL_IDS.map((id) => VOWEL_IPA[id]))];
    expect(new Set(sounds.map(spokenIpa)).size).toBe(sounds.length);
  });
});

describe('vowelOnCarrier', () => {
  it.each([
    [VOWEL.Aa, 'อา'],
    [VOWEL.Iia, 'เอีย'],
    [VOWEL.Oor, 'ออ'],
    [VOWEL.Am, 'อำ'],
    [VOWEL.Or, 'เอาะ'],
  ])('writes %s on the silent consonant อ: %s', (id, written) => {
    expect(vowelOnCarrier(vowel(id))).toBe(written);
  });
});
