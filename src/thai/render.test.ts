import { describe, expect, it } from 'vitest';
import { render } from './render';
import { vowel } from './vowels';
import type { VowelId } from './types';

const WITH_KO_KAI: [VowelId, string][] = [
  ['a', 'กะ'],
  ['aa', 'กา'],
  ['i', 'กิ'],
  ['ii', 'กี'],
  ['ue', 'กึ'],
  ['uee', 'กือ'],
  ['u', 'กุ'],
  ['uu', 'กู'],
  ['e', 'เกะ'],
  ['ee', 'เก'],
  ['ae', 'แกะ'],
  ['aee', 'แก'],
  ['o', 'โกะ'],
  ['oo', 'โก'],
  ['or', 'เกาะ'],
  ['oor', 'กอ'],
  ['oe', 'เกอะ'],
  ['oee', 'เกอ'],
  ['ia', 'เกียะ'],
  ['iia', 'เกีย'],
  ['uea', 'เกือะ'],
  ['ueea', 'เกือ'],
  ['ua', 'กัวะ'],
  ['uua', 'กัว'],
];

const REAL_WORDS: [string, VowelId, string][] = [
  ['ม', 'uee', 'มือ'],
  ['ต', 'uua', 'ตัว'],
  ['ธ', 'oee', 'เธอ'],
  ['ส', 'ueea', 'เสือ'],
  ['ข', 'aa', 'ขา'],
];

describe('render (open syllable, no tone mark)', () => {
  it.each(WITH_KO_KAI)('ก + %s → %s', (id, expected) => {
    expect(render('ก', vowel(id))).toBe(expected);
  });

  // Same rule with other consonants than ก, checked against real Thai words.
  it.each(REAL_WORDS)('%s + %s → %s', (consonantChar, id, expected) => {
    expect(render(consonantChar, vowel(id))).toBe(expected);
  });

  it('rejects an unknown consonant', () => {
    expect(() => render('ฃ', vowel('aa'))).toThrow(/Unknown consonant/);
  });
});
