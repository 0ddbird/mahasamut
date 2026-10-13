import { describe, expect, it } from 'vitest';
import { onset } from '../consonants/onsets';
import { vowel, VOWELS } from '../vowels';
import { checkSyllable } from './index';
import type { ToneMark, VowelId } from '../types';

/** Builds the parts of a syllable from plain strings, as in the other test tables. */
const parts = (
  onsetText: string,
  id: VowelId,
  final: string | null = null,
  mark: ToneMark = 'none',
) => ({
  onset: onset(onsetText),
  vowel: vowel(id),
  final,
  mark,
});

describe('checkSyllable', () => {
  describe('rule 1: ๊ and ๋ only on a mid-class onset', () => {
    it.each([
      ['ก', 'trii'], // mid
      ['จ', 'djattawaa'], // mid
      ['ปล', 'trii'], // cluster, mid like ป
      ['อย', 'djattawaa'], // leading อ, mid
    ] as [string, ToneMark][])('accepts %s + %s', (onsetText, mark) => {
      expect(checkSyllable(parts(onsetText, 'aa', null, mark))).toBeNull();
    });

    it.each([
      ['ข', 'trii'], // high
      ['ค', 'djattawaa'], // low
      ['ขว', 'trii'], // cluster, high like ข
      ['หม', 'djattawaa'], // leading ห makes ม high
      ['ม', 'trii'], // low, even though หม is high
    ] as [string, ToneMark][])('rejects %s + %s', (onsetText, mark) => {
      expect(checkSyllable(parts(onsetText, 'aa', null, mark))).toMatch(/mid class/);
    });

    it.each(['none', 'eek', 'thoo'] as ToneMark[])('accepts %s on every class', (mark) => {
      for (const onsetText of ['ก', 'ข', 'ค', 'หม', 'ปล']) {
        expect(checkSyllable(parts(onsetText, 'aa', null, mark)), onsetText).toBeNull();
      }
    });
  });

  describe('rule 2: a final that can end a syllable, after a vowel that takes one', () => {
    it.each([
      ['aa', 'น'], // กาน
      ['a', 'ก'], // กัก
      ['o', 'ด'], // กด, invisible o
      ['oee', 'น'], // เกิน
    ] as [VowelId, string][])('accepts %s + final %s', (id, final) => {
      expect(checkSyllable(parts('ก', id, final))).toBeNull();
    });

    it.each(['ฉ', 'ฌ', 'ผ', 'ฝ', 'ห', 'อ', 'ฮ'])('rejects %s as a final', (final) => {
      expect(checkSyllable(parts('ก', 'aa', final))).toMatch(/cannot end a syllable/);
    });

    // prettier-ignore
    const VOWELS_WITHOUT_FINAL: VowelId[] = [
      'or', 'oe', 'ia', 'uea', 'ua', // open only
      'am', 'ai_muan', 'ai_malai', 'ao', // sara koen
    ];

    it.each(VOWELS_WITHOUT_FINAL)('rejects %s with a final', (id) => {
      expect(checkSyllable(parts('ก', id, 'น'))).toMatch(/takes no final/);
    });

    it.each(VOWELS_WITHOUT_FINAL)('accepts %s without a final', (id) => {
      expect(checkSyllable(parts('ก', id))).toBeNull();
    });
  });

  describe('rule 3: ย and ว finals only after some vowels', () => {
    // prettier-ignore
    const VOWELS_BEFORE: [string, VowelId[]][] = [
      ['ย', ['aa', 'u', 'uu', 'oor', 'oo', 'oee', 'uua', 'ueea']], // สาย คุย ลอย โดย เลย สวย เหนื่อย
      ['ว', ['aa', 'i', 'e', 'ee', 'ae', 'aee', 'iia']], // ขาว หิว เร็ว เลว แมว เขียว
    ];

    const allowed = VOWELS_BEFORE.flatMap(([final, ids]) =>
      ids.map((id): [VowelId, string] => [id, final]),
    );

    const vowelsTakingAFinal = VOWELS.filter((v) => v.closed !== null).map((v) => v.id);
    const forbidden = VOWELS_BEFORE.flatMap(([final, ids]) =>
      vowelsTakingAFinal
        .filter((id) => !ids.includes(id))
        .map((id): [VowelId, string] => [id, final]),
    );

    it.each(allowed)('accepts %s + final %s', (id, final) => {
      expect(checkSyllable(parts('ม', id, final))).toBeNull();
    });

    it.each(forbidden)('rejects %s + final %s', (id, final) => {
      expect(checkSyllable(parts('ม', id, final))).toMatch(/cannot follow/);
    });
  });

  describe('rule 4: invisible o never with a ร ว ย final', () => {
    it.each(['น', 'ม', 'ง', 'ก', 'ด', 'บ'])('accepts invisible o + final %s', (final) => {
      expect(checkSyllable(parts('ค', 'o', final))).toBeNull();
    });

    it.each(['ช', 'ม', 'ก', 'พ'])('accepts %s + invisible o + final ล', (onsetText) => {
      expect(checkSyllable(parts(onsetText, 'o', 'ล'))).toBeNull(); // ชล, มล, กล, พล
    });

    it.each(['ค', 'ม', 'ช'])('rejects %s + invisible o + final ร', (onsetText) => {
      expect(checkSyllable(parts(onsetText, 'o', 'ร'))).toMatch(/invisible o/); // read -ɔɔn
    });

    // Rule 3 already rejects these, and is checked first.
    it.each(['ว', 'ย'])('rejects invisible o + final %s', (final) => {
      expect(checkSyllable(parts('ม', 'o', final))).not.toBeNull();
    });

    it.each(['ร', 'ล'])('accepts final %s after a written vowel', (final) => {
      expect(checkSyllable(parts('ก', 'aa', final))).toBeNull();
    });
  });

  describe('rule 5: an onset ending in ว takes neither -ัว, -ัวะ nor the invisible o', () => {
    const ONSETS_ENDING_IN_WO = ['กว', 'ขว', 'คว', 'หว'];

    // กว + invisible o + น would be written กวน, which reads ก + ua + น.
    it.each(ONSETS_ENDING_IN_WO)('rejects %s + invisible o + final', (onsetText) => {
      for (const final of ['น', 'ก', 'ด']) {
        expect(checkSyllable(parts(onsetText, 'o', final)), final).toMatch(/ends in ว/);
      }
    });

    it.each(ONSETS_ENDING_IN_WO)('rejects %s + -ัว, open or closed', (onsetText) => {
      expect(checkSyllable(parts(onsetText, 'uua'))).toMatch(/ends in ว/);
      expect(checkSyllable(parts(onsetText, 'uua', 'น'))).toMatch(/ends in ว/);
    });

    it.each(ONSETS_ENDING_IN_WO)('rejects %s + -ัวะ', (onsetText) => {
      expect(checkSyllable(parts(onsetText, 'ua'))).toMatch(/ends in ว/);
    });

    it.each(ONSETS_ENDING_IN_WO)('accepts %s + โ-ะ, where the o is written', (onsetText) => {
      expect(checkSyllable(parts(onsetText, 'o'))).toBeNull();
    });

    type Case = [string, VowelId, string | null];
    it.each([
      ['กว', 'aa', 'ง'], // กวาง
      ['หว', 'aa', 'น'], // หวาน
      ['คว', 'aa', 'ม'], // ความ
      ['ว', 'uua', null], // วัว, single ว
      ['ว', 'o', 'น'], // วน, single ว
      ['ก', 'uua', 'น'], // กวน
      ['ห', 'uua', 'น'], // หวน
    ] as Case[])('accepts %s + %s + final %s', (onsetText, id, final) => {
      expect(checkSyllable(parts(onsetText, id, final))).toBeNull();
    });
  });

  // Rule 6 is gone: a final written right after the onset may form another onset.
  // Both readings are kept, as two analyses of the same text (see syllables.ts).
  describe('former rule 6: a final that forms another onset with the onset', () => {
    it.each([
      ['ก', 'ee', 'ร'], // เกร, also กร + เ-
      ['ห', 'oo', 'ม'], // โหม, also หม + โ-
      ['ห', 'aee', 'น'], // แหน, also หน + แ-
      ['ข', 'aee', 'ว'], // แขว, also ขว + แ-
      ['อ', 'oo', 'ย'], // โอย, also อย + โ-
      ['ห', 'oee', 'ย'], // เหย, also หย + เ-
    ] as [string, VowelId, string][])('accepts %s + %s + final %s', (onsetText, id, final) => {
      expect(checkSyllable(parts(onsetText, id, final))).toBeNull();
    });
  });

  describe('rule 7: long ee and aee never closed with a tone mark', () => {
    type Case = [string, VowelId, string | null, ToneMark];

    // Written like short e / ae under a mark (เล่น, แข่ง), so read as short.
    it.each([
      ['ก', 'ee', 'น', 'eek'], // เก่น
      ['ก', 'ee', 'ว', 'thoo'], // เก้ว
      ['ก', 'aee', 'ง', 'eek'], // แก่ง
      ['ก', 'aee', 'น', 'trii'], // แก๊น
    ] as Case[])('rejects %s + %s + final %s, mark %s', (onsetText, id, final, mark) => {
      expect(checkSyllable(parts(onsetText, id, final, mark))).toMatch(/read as short/);
    });

    it.each([
      ['ก', 'aee', null, 'eek'], // แก่, open
      ['ก', 'ee', null, 'thoo'], // เก้, open
      ['ก', 'ee', 'น', 'none'], // เกน, no mark
      ['ม', 'aee', 'ว', 'none'], // แมว, no mark
      ['ล', 'e', 'น', 'eek'], // เล่น, short e
      ['ข', 'ae', 'ง', 'eek'], // แข่ง, short ae
    ] as Case[])('accepts %s + %s + final %s, mark %s', (onsetText, id, final, mark) => {
      expect(checkSyllable(parts(onsetText, id, final, mark))).toBeNull();
    });
  });
});
