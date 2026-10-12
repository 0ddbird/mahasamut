import { describe, expect, it } from 'vitest';
import { onset } from '../consonants/onsets';
import { vowel } from '../vowels';
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
});
