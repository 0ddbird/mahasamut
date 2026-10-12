import { describe, expect, it } from 'vitest';
import { onset } from './consonants/onsets';
import { render } from './render';
import { vowel } from './vowels';
import type { ToneMark, VowelId } from './types';

/** Code points of a string, so tests check exact characters rather than look-alike glyphs. */
const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));

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
  ['am', 'กำ'],
  ['ai_muan', 'ใก'],
  ['ai_malai', 'ไก'],
  ['ao', 'เกา'],
];

const REAL_WORDS: [string, VowelId, string][] = [
  ['ม', 'uee', 'มือ'],
  ['ต', 'uua', 'ตัว'],
  ['ธ', 'oee', 'เธอ'],
  ['ส', 'ueea', 'เสือ'],
  ['ข', 'aa', 'ขา'],
  ['ข', 'am', 'ขำ'],
  ['จ', 'ai_muan', 'ใจ'],
  ['ป', 'ai_malai', 'ไป'],
  ['ข', 'ao', 'เขา'],
];

describe('render (open syllable, no tone mark)', () => {
  it.each(WITH_KO_KAI)('ก + %s → %s', (id, expected) => {
    expect(render({ onset: onset('ก'), vowel: vowel(id) })).toBe(expected);
  });

  // Same rule with other consonants than ก, checked against real Thai words.
  it.each(REAL_WORDS)('%s + %s → %s', (onsetText, id, expected) => {
    expect(render({ onset: onset(onsetText), vowel: vowel(id) })).toBe(expected);
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
    // โ-ะ disappears before a final: the o is not written at all
    ['ค', 'o', 'น', 'คน'],
    ['น', 'o', 'ก', 'นก'],
    ['ร', 'o', 'ส', 'รส'],
  ];

  it.each(WITH_KO_KAI_AND_NO_NUU)('ก + %s + น → %s', (id, expected) => {
    expect(render({ onset: onset('ก'), vowel: vowel(id), final: 'น' })).toBe(expected);
  });

  // Same rule with other consonants and finals, checked against real Thai words.
  it.each(REAL_WORDS)('%s + %s + %s → %s', (onsetText, id, final, expected) => {
    expect(render({ onset: onset(onsetText), vowel: vowel(id), final })).toBe(expected);
  });

  it.each(['or', 'ua', 'am', 'ai_malai', 'ao'] as VowelId[])(
    'rejects a final after %s, which has no closed form',
    (id) => {
      expect(() => render({ onset: onset('ก'), vowel: vowel(id), final: 'น' })).toThrow(
        /cannot take a final consonant/,
      );
    },
  );

  it('rejects a letter that cannot be a final consonant', () => {
    expect(() => render({ onset: onset('ก'), vowel: vowel('aa'), final: 'ห' })).toThrow(
      /cannot be a final consonant/,
    );
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
    // Sara koen: ำ ใ ไ า are not written on the consonant, so the mark sits right on it
    ['น', 'am', null, 'thoo', 'น้ำ'],
    ['ม', 'ai_malai', null, 'eek', 'ไม่'],
    ['ก', 'ao', null, 'thoo', 'เก้า'],
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
    // With the invisible o, the mark sits right on the consonant
    ['ต', 'o', 'น', 'thoo', 'ต้น'],
    ['ร', 'o', 'ม', 'eek', 'ร่ม'],
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

  it.each(MARKED)('%s + %s + %s + %s → %s', (onsetText, id, final, mark, expected) => {
    expect(render({ onset: onset(onsetText), vowel: vowel(id), final, mark })).toBe(expected);
  });

  // Checked as code points: ก + ่ + ี and ก + ี + ่ can look the same on screen,
  // but only the second order is correct Thai text.
  it('writes the mark after the vowel sign, not before it', () => {
    // ก ี ่
    expect(codePoints(render({ onset: onset('ก'), vowel: vowel('ii'), mark: 'eek' }))).toEqual([
      0x0e01, 0x0e35, 0x0e48,
    ]);
    // ก ุ ้ ง
    expect(
      codePoints(render({ onset: onset('ก'), vowel: vowel('u'), final: 'ง', mark: 'thoo' })),
    ).toEqual([0x0e01, 0x0e38, 0x0e49, 0x0e07]);
  });

  // Checked as code points: the mark goes on the consonant, before sara am (U+0E33).
  it('writes the mark before ำ', () => {
    // น ้ ำ
    expect(codePoints(render({ onset: onset('น'), vowel: vowel('am'), mark: 'thoo' }))).toEqual([
      0x0e19, 0x0e49, 0x0e33,
    ]);
  });

  // Checked as code points: ็ (U+0E47) must not remain next to the tone mark.
  it('never writes ็ together with a tone mark', () => {
    // เ ล ่ น
    expect(
      codePoints(render({ onset: onset('ล'), vowel: vowel('e'), final: 'น', mark: 'eek' })),
    ).toEqual([0x0e40, 0x0e25, 0x0e48, 0x0e19]);
    // แ ข ่ ง
    expect(
      codePoints(render({ onset: onset('ข'), vowel: vowel('ae'), final: 'ง', mark: 'eek' })),
    ).toEqual([0x0e41, 0x0e02, 0x0e48, 0x0e07]);
  });

  it('writes nothing for "none"', () => {
    expect(render({ onset: onset('ก'), vowel: vowel('aa'), mark: 'none' })).toBe('กา');
  });
});

describe('render (complex onsets)', () => {
  const COMPLEX: [string, VowelId, string | null, ToneMark, string][] = [
    // Clusters
    ['ปล', 'aa', null, 'none', 'ปลา'],
    ['คร', 'uu', null, 'none', 'ครู'],
    ['ขว', 'aa', null, 'none', 'ขวา'],
    ['กล', 'o', 'ม', 'none', 'กลม'],
    ['ปล', 'oor', 'ย', 'eek', 'ปล่อย'],
    ['ขว', 'aa', 'ง', 'thoo', 'ขว้าง'],
    ['คร', 'a', 'ง', 'thoo', 'ครั้ง'],
    ['ปล', 'ao', null, 'eek', 'เปล่า'],
    // Leading ห (ห นำ)
    ['หม', 'aa', null, 'none', 'หมา'],
    ['หน', 'uu', null, 'none', 'หนู'],
    ['หม', 'o', 'ด', 'none', 'หมด'],
    ['หล', 'ueea', 'ง', 'none', 'เหลือง'],
    ['หน', 'aa', null, 'thoo', 'หน้า'],
    ['หม', 'ai_muan', null, 'eek', 'ใหม่'],
    // Leading อ (อ นำ)
    ['อย', 'aa', null, 'eek', 'อย่า'],
    ['อย', 'uu', null, 'eek', 'อยู่'],
  ];

  it.each(COMPLEX)('%s + %s + %s + %s → %s', (onsetText, id, final, mark, expected) => {
    expect(render({ onset: onset(onsetText), vowel: vowel(id), final, mark })).toBe(expected);
  });

  // Checked as code points: the mark goes on the last consonant of the onset.
  it('writes the mark on the last consonant of the onset', () => {
    // ป ล ่ อ ย
    expect(
      codePoints(render({ onset: onset('ปล'), vowel: vowel('oor'), final: 'ย', mark: 'eek' })),
    ).toEqual([0x0e1b, 0x0e25, 0x0e48, 0x0e2d, 0x0e22]);
    // ห น ้ า
    expect(codePoints(render({ onset: onset('หน'), vowel: vowel('aa'), mark: 'thoo' }))).toEqual([
      0x0e2b, 0x0e19, 0x0e49, 0x0e32,
    ]);
  });
});
