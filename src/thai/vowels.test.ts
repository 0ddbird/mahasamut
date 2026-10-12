import { describe, expect, it } from 'vitest';
import { CONSONANT_SLOT, VOWELS, vowel } from './vowels';
import { VOWEL_IDS } from './types';
import type { VowelId, VowelLength } from './types';

const LENGTHS: [VowelId, VowelLength][] = [
  ['a', 'short'],
  ['aa', 'long'],
  ['i', 'short'],
  ['ii', 'long'],
  ['ue', 'short'],
  ['uee', 'long'],
  ['u', 'short'],
  ['uu', 'long'],
  ['e', 'short'],
  ['ee', 'long'],
  ['ae', 'short'],
  ['aee', 'long'],
  ['o', 'short'],
  ['oo', 'long'],
  ['or', 'short'],
  ['oor', 'long'],
  ['oe', 'short'],
  ['oee', 'long'],
  ['ia', 'short'],
  ['iia', 'long'],
  ['uea', 'short'],
  ['ueea', 'long'],
  ['ua', 'short'],
  ['uua', 'long'],
];

describe('vowels', () => {
  it('uses the dotted circle U+25CC as the consonant slot', () => {
    expect(CONSONANT_SLOT).toBe('◌');
  });

  it('defines one vowel per id, in the same order', () => {
    expect(VOWELS.map((v) => v.id)).toEqual(VOWEL_IDS);
  });

  it.each(VOWELS.map((v) => [v.id, v.open]))('%s template %s has exactly one consonant slot', (_id, open) => {
    expect(open.split(CONSONANT_SLOT)).toHaveLength(2);
  });

  it.each(LENGTHS)('%s is %s', (id, length) => {
    expect(vowel(id).length).toBe(length);
  });

  it('rejects an unknown vowel id', () => {
    expect(() => vowel('xx' as VowelId)).toThrow(/Unknown vowel/);
  });
});

describe('closed forms (vowel written before a final consonant)', () => {
  const CLOSED: [VowelId, string][] = [
    ['a', '◌ั'],
    ['aa', '◌า'],
    ['i', '◌ิ'],
    ['ii', '◌ี'],
    ['ue', '◌ึ'],
    ['u', '◌ุ'],
    ['uu', '◌ู'],
    ['ee', 'เ◌'],
    ['aee', 'แ◌'],
    ['oo', 'โ◌'],
    ['oor', '◌อ'],
    ['iia', 'เ◌ีย'],
    ['ueea', 'เ◌ือ'],
  ];

  // Never followed by a final consonant.
  const NEVER_CLOSED: VowelId[] = ['or', 'oe', 'ia', 'uea', 'ua'];

  // Their closed form changes shape; handled in a later step.
  const NOT_YET_CLOSED: VowelId[] = ['e', 'ae', 'uee', 'o', 'oee', 'uua'];

  it.each(CLOSED)('%s is written %s before a final', (id, closed) => {
    expect(vowel(id).closed).toBe(closed);
  });

  it.each([...NEVER_CLOSED, ...NOT_YET_CLOSED])('%s has no closed form (yet)', (id) => {
    expect(vowel(id).closed).toBeNull();
  });

  it('covers all 24 vowels', () => {
    expect(CLOSED.length + NEVER_CLOSED.length + NOT_YET_CLOSED.length).toBe(24);
  });

  it.each(CLOSED)('%s closed template %s has exactly one consonant slot', (_id, closed) => {
    expect(closed.split(CONSONANT_SLOT)).toHaveLength(2);
  });
});
