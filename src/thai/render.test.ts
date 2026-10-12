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

describe('render (closed syllable, no tone mark)', () => {
  const WITH_KO_KAI_AND_NO_NUU: [VowelId, string][] = [
    ['a', 'กัน'],
    ['aa', 'กาน'],
    ['i', 'กิน'],
    ['ii', 'กีน'],
    ['ue', 'กึน'],
    ['u', 'กุน'],
    ['uu', 'กูน'],
    ['ee', 'เกน'],
    ['aee', 'แกน'],
    ['oo', 'โกน'],
    ['oor', 'กอน'],
    ['iia', 'เกียน'],
    ['ueea', 'เกือน'],
  ];

  const REAL_WORDS: [string, VowelId, string, string][] = [
    ['จ', 'a', 'บ', 'จับ'],
    ['ม', 'aa', 'ก', 'มาก'],
    ['ร', 'iia', 'น', 'เรียน'],
    ['ม', 'ueea', 'ง', 'เมือง'],
    ['ก', 'oor', 'ง', 'กอง'],
    ['ส', 'u', 'ข', 'สุข'],
  ];

  it.each(WITH_KO_KAI_AND_NO_NUU)('ก + %s + น → %s', (id, expected) => {
    expect(render('ก', vowel(id), 'น')).toBe(expected);
  });

  // Same rule with other consonants and finals, checked against real Thai words.
  it.each(REAL_WORDS)('%s + %s + %s → %s', (consonantChar, id, final, expected) => {
    expect(render(consonantChar, vowel(id), final)).toBe(expected);
  });

  it.each(['or', 'ua'] as VowelId[])('rejects a final after %s, which has no closed form', (id) => {
    expect(() => render('ก', vowel(id), 'น')).toThrow(/cannot take a final consonant/);
  });

  it('rejects a letter that cannot be a final consonant', () => {
    expect(() => render('ก', vowel('aa'), 'ห')).toThrow(/cannot be a final consonant/);
  });
});
