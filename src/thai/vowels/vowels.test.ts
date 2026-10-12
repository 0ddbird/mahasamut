import { describe, expect, it } from 'vitest';
import {
  CHANGING_VOWELS,
  CONSONANT_SLOT,
  OPEN_ONLY_VOWELS,
  REGULAR_VOWELS,
  SARA_KOEN_VOWELS,
  VOWEL_SIGNS_ON_CONSONANT,
  VOWELS,
  vowel,
} from './index';
import { VOWEL_IDS } from '../types';
import type { FinalSound, VowelId, VowelLength } from '../types';

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
  ['am', 'short'],
  ['ai_muan', 'short'],
  ['ai_malai', 'short'],
  ['ao', 'short'],
];

/** Code points of a string, so tests check exact characters rather than look-alike glyphs. */
const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));

describe('vowels', () => {
  it('uses the dotted circle U+25CC as the consonant slot', () => {
    expect(codePoints(CONSONANT_SLOT)).toEqual([0x25cc]);
  });

  it('lists the vowel signs written above or below the consonant: ั ิ ี ึ ื ุ ู', () => {
    expect(VOWEL_SIGNS_ON_CONSONANT.flatMap(codePoints)).toEqual([
      0x0e31, // ั
      0x0e34, // ิ
      0x0e35, // ี
      0x0e36, // ึ
      0x0e37, // ื
      0x0e38, // ุ
      0x0e39, // ู
    ]);
  });

  it('puts each vowel in exactly one group', () => {
    const grouped = [
      ...REGULAR_VOWELS,
      ...CHANGING_VOWELS,
      ...OPEN_ONLY_VOWELS,
      ...SARA_KOEN_VOWELS,
    ].map((v) => v.id);
    expect([...grouped].sort()).toEqual([...VOWEL_IDS].sort());
  });

  it('keeps regular vowels the same before a final, and open-only vowels without one', () => {
    for (const v of REGULAR_VOWELS) expect(v.closed, v.id).toBe(v.open);
    for (const v of OPEN_ONLY_VOWELS) expect(v.closed, v.id).toBeNull();
  });

  it('defines one vowel per id, in the same order', () => {
    expect(VOWELS.map((v) => v.id)).toEqual(VOWEL_IDS);
  });

  it.each(VOWELS.map((v) => [v.id, v.open]))(
    '%s template %s has exactly one consonant slot',
    (_id, open) => {
      expect(open.split(CONSONANT_SLOT)).toHaveLength(2);
    },
  );

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
    // The closed form drops part of the open one
    ['uee', '◌ื'],
    ['uua', '◌ว'],
    ['oee', 'เ◌ิ'],
    // The closed form adds ็ (mai taikhu)
    ['e', 'เ◌็'],
    ['ae', 'แ◌็'],
    // The vowel disappears: only the consonant is left before the final
    ['o', '◌'],
  ];

  // Never followed by a final consonant.
  const NEVER_CLOSED: VowelId[] = ['or', 'oe', 'ia', 'uea', 'ua'];

  // Sara koen already end with a final sound, so they never take another final.
  const SARA_KOEN: VowelId[] = ['am', 'ai_muan', 'ai_malai', 'ao'];

  it.each(CLOSED)('%s is written %s before a final', (id, closed) => {
    expect(vowel(id).closed).toBe(closed);
  });

  it.each([...NEVER_CLOSED, ...SARA_KOEN])('%s has no closed form', (id) => {
    expect(vowel(id).closed).toBeNull();
  });

  it('covers all 28 vowels', () => {
    expect(CLOSED.length + NEVER_CLOSED.length + SARA_KOEN.length).toBe(28);
  });

  it.each(CLOSED)('%s closed template %s has exactly one consonant slot', (_id, closed) => {
    expect(closed.split(CONSONANT_SLOT)).toHaveLength(2);
  });

  it('writes เ-อ as เ◌ before a final ย (เลย)', () => {
    expect(vowel('oee').closedBeforeY).toBe('เ◌');
  });

  it('has no special form before ย for the other vowels', () => {
    const others = VOWELS.filter((v) => v.id !== 'oee');
    for (const v of others) expect(v.closedBeforeY, v.id).toBeUndefined();
  });

  it.each([
    ['e', 'เ◌'],
    ['ae', 'แ◌'],
  ] as [VowelId, string][])(
    'drops ็ from %s when a tone mark is written: %s',
    (id, closedMarked) => {
      expect(vowel(id).closedMarked).toBe(closedMarked);
    },
  );

  it('has no special marked form for the other vowels', () => {
    const others = VOWELS.filter((v) => v.id !== 'e' && v.id !== 'ae');
    for (const v of others) expect(v.closedMarked, v.id).toBeUndefined();
  });
});

describe('sara koen (vowels with a built-in final sound)', () => {
  const SARA_KOEN: [VowelId, string, FinalSound][] = [
    ['am', '◌ำ', 'm'],
    ['ai_muan', 'ใ◌', 'y'],
    ['ai_malai', 'ไ◌', 'y'],
    ['ao', 'เ◌า', 'w'],
  ];

  it.each(SARA_KOEN)('%s is written %s and ends with /%s/', (id, open, inherentFinal) => {
    expect(vowel(id).open).toBe(open);
    expect(vowel(id).inherentFinal).toBe(inherentFinal);
  });

  it('puts exactly the four sara koen in their group', () => {
    expect(SARA_KOEN_VOWELS.map((v) => v.id)).toEqual(SARA_KOEN.map(([id]) => id));
  });

  it('gives no built-in final to the other vowels', () => {
    const others = VOWELS.filter((v) => !SARA_KOEN_VOWELS.includes(v));
    for (const v of others) expect(v.inherentFinal, v.id).toBeUndefined();
  });
});
