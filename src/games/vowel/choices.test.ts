import { describe, expect, it } from 'vitest';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { VOWEL } from '../../thai/types';
import { vowel, VOWELS } from '../../thai/vowels';
import { VOWEL_IPA } from '../../thai/vowels/ipa';
import { CHOICE_COUNT, LENGTH_PARTNER, vowelChoices } from './choices';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('vowelChoices', () => {
  it('offers four different sounds, the right one among them, for every vowel', () => {
    expect(CHOICE_COUNT).toBe(4);
    for (const v of VOWELS) {
      for (const seed of SEEDS) {
        const choices = vowelChoices(v, seededRng(seed));
        expect(choices).toHaveLength(CHOICE_COUNT);
        expect(new Set(choices).size).toBe(CHOICE_COUNT);
        expect(choices).toContain(VOWEL_IPA[v.id]);
      }
    }
  });

  it('always offers the vowel of the other length, when there is one', () => {
    for (const v of VOWELS) {
      const partner = LENGTH_PARTNER[v.id];
      if (partner === undefined) continue;
      for (const seed of SEEDS) {
        expect(vowelChoices(v, seededRng(seed))).toContain(VOWEL_IPA[partner]);
      }
    }
  });

  it('pairs every simple vowel with the vowel of the other length, both ways', () => {
    expect(LENGTH_PARTNER[VOWEL.A]).toBe(VOWEL.Aa);
    expect(LENGTH_PARTNER[VOWEL.Aa]).toBe(VOWEL.A);
    expect(LENGTH_PARTNER[VOWEL.Uua]).toBe(VOWEL.Ua);
    expect(Object.keys(LENGTH_PARTNER)).toHaveLength(24);
    expect(LENGTH_PARTNER[VOWEL.Am]).toBeUndefined();
  });

  it('never offers /aj/ twice, though ใ and ไ both sound so', () => {
    for (const id of [VOWEL.AiMuan, VOWEL.AiMalai]) {
      for (const seed of SEEDS) {
        const choices = vowelChoices(vowel(id), seededRng(seed));
        expect(choices.filter((choice) => choice === 'aj')).toHaveLength(1);
      }
    }
  });

  it('gives the same choices for the same seed', () => {
    const v = vowel(VOWEL.Iia);
    expect(vowelChoices(v, seededRng(7))).toEqual(vowelChoices(v, seededRng(7)));
  });

  it('puts the right answer in any place', () => {
    const v = vowel(VOWEL.Oo);
    const places = new Set(SEEDS.map((seed) => vowelChoices(v, seededRng(seed)).indexOf('oː')));
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });
});
