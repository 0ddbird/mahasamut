import { describe, expect, it } from 'vitest';
import { render } from './render';
import { vowel } from './vowels';
import type { ToneMark, VowelId } from './types';

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
    // -ือ loses its อ before a final
    ['ม', 'uee', 'ด', 'มืด'],
    ['ค', 'uee', 'น', 'คืน'],
    // -ัว loses its ั before a final
    ['ค', 'uua', 'ร', 'ควร'],
    ['ส', 'uua', 'ย', 'สวย'],
    // เ-อ becomes เ-ิ- before a final...
    ['ด', 'oee', 'น', 'เดิน'],
    ['ก', 'oee', 'ด', 'เกิด'],
    // ... but เ-ย before the final ย
    ['ล', 'oee', 'ย', 'เลย'],
    ['ค', 'oee', 'ย', 'เคย'],
    // เ-ะ and แ-ะ become เ-็- and แ-็- before a final
    ['ล', 'e', 'ก', 'เล็ก'],
    ['ป', 'e', 'น', 'เป็น'],
    ['ร', 'e', 'ว', 'เร็ว'],
    ['ข', 'ae', 'ง', 'แข็ง'],
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

describe('render (tone marks)', () => {
  const MARKED: [string, VowelId, string | null, ToneMark, string][] = [
    // Mark right after the consonant
    ['ก', 'aa', null, 'eek', 'ก่า'],
    ['ม', 'aa', null, 'thoo', 'ม้า'],
    ['ค', 'a', null, 'eek', 'ค่ะ'],
    ['จ', 'a', null, 'trii', 'จ๊ะ'],
    ['ต', 'o', null, 'trii', 'โต๊ะ'],
    ['ก', 'or', null, 'trii', 'เก๊าะ'],
    ['ข', 'aa', 'ว', 'thoo', 'ข้าว'],
    ['น', 'oor', 'ง', 'thoo', 'น้อง'],
    ['ม', 'uua', 'ง', 'eek', 'ม่วง'],
    ['ก', 'uua', 'ย', 'djattawaa', 'ก๋วย'],
    ['อ', 'oee', 'ย', 'eek', 'เอ่ย'],
    // เ-็- and แ-็- lose their ็ when a tone mark takes its place
    ['ล', 'e', 'น', 'eek', 'เล่น'],
    ['ต', 'e', 'น', 'thoo', 'เต้น'],
    ['ก', 'e', 'ง', 'eek', 'เก่ง'],
    ['ข', 'ae', 'ง', 'eek', 'แข่ง'],
    // Mark after a vowel written above the consonant
    ['ด', 'uee', 'ม', 'eek', 'ดื่ม'],
    ['ป', 'oee', 'น', 'eek', 'เปิ่น'],
    ['ก', 'ii', null, 'eek', 'กี่'],
    ['ก', 'i', 'ง', 'eek', 'กิ่ง'],
    ['ก', 'a', 'น', 'thoo', 'กั้น'],
    ['ก', 'ueea', null, 'thoo', 'เกื้อ'],
    ['ก', 'iia', 'ว', 'eek', 'เกี่ยว'],
    ['ต', 'uua', null, 'djattawaa', 'ตั๋ว'],
    // Mark after a vowel written below the consonant
    ['ก', 'u', 'ง', 'thoo', 'กุ้ง'],
    ['ป', 'uu', null, 'eek', 'ปู่'],
  ];

  it.each(MARKED)('%s + %s + %s + %s → %s', (consonantChar, id, final, mark, expected) => {
    expect(render(consonantChar, vowel(id), final, mark)).toBe(expected);
  });

  // Checked as code points: ก + ่ + ี and ก + ี + ่ can look the same on screen,
  // but only the second order is correct Thai text.
  it('writes the mark after the vowel sign, not before it', () => {
    const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));
    // ก ี ่
    expect(codePoints(render('ก', vowel('ii'), null, 'eek'))).toEqual([0x0e01, 0x0e35, 0x0e48]);
    // ก ุ ้ ง
    expect(codePoints(render('ก', vowel('u'), 'ง', 'thoo'))).toEqual([
      0x0e01, 0x0e38, 0x0e49, 0x0e07,
    ]);
  });

  // Checked as code points: ็ (U+0E47) must not remain next to the tone mark.
  it('never writes ็ together with a tone mark', () => {
    const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));
    // เ ล ่ น
    expect(codePoints(render('ล', vowel('e'), 'น', 'eek'))).toEqual([
      0x0e40, 0x0e25, 0x0e48, 0x0e19,
    ]);
    // แ ข ่ ง
    expect(codePoints(render('ข', vowel('ae'), 'ง', 'eek'))).toEqual([
      0x0e41, 0x0e02, 0x0e48, 0x0e07,
    ]);
  });

  it('writes nothing for "none"', () => {
    expect(render('ก', vowel('aa'), null, 'none')).toBe('กา');
  });
});
