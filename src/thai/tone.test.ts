import { describe, expect, it } from 'vitest';
import { computeTone } from './tone';
import { LIVENESSES, VOWEL_LENGTHS } from './types';
import type { ConsonantClass, Liveness, Tone, ToneMark, VowelLength } from './types';

const UNMARKED: [ConsonantClass, Liveness, VowelLength, Tone][] = [
  ['mid', 'live', 'short', 'mid'],
  ['mid', 'live', 'long', 'mid'],
  ['mid', 'dead', 'short', 'low'],
  ['mid', 'dead', 'long', 'low'],
  ['high', 'live', 'short', 'rising'],
  ['high', 'live', 'long', 'rising'],
  ['high', 'dead', 'short', 'low'],
  ['high', 'dead', 'long', 'low'],
  ['low', 'live', 'short', 'mid'],
  ['low', 'live', 'long', 'mid'],
  ['low', 'dead', 'short', 'high'],
  ['low', 'dead', 'long', 'falling'],
];

const MARKED: [ConsonantClass, ToneMark, Tone][] = [
  ['mid', 'eek', 'low'],
  ['mid', 'thoo', 'falling'],
  ['mid', 'trii', 'high'],
  ['mid', 'djattawaa', 'rising'],
  ['high', 'eek', 'low'],
  ['high', 'thoo', 'falling'],
  ['low', 'eek', 'falling'],
  ['low', 'thoo', 'high'],
];

describe('computeTone', () => {
  describe('without a tone mark', () => {
    it.each(UNMARKED)(
      '%s class, %s syllable, %s vowel → %s tone',
      (cls, liveness, length, tone) => {
        expect(computeTone(cls, liveness, length, 'none')).toBe(tone);
      },
    );
  });

  describe('with a tone mark', () => {
    it.each(MARKED)('%s class + mai %s → %s tone, whatever the syllable', (cls, mark, tone) => {
      for (const liveness of LIVENESSES) {
        for (const length of VOWEL_LENGTHS) {
          expect(computeTone(cls, liveness, length, mark)).toBe(tone);
        }
      }
    });

    it.each([
      ['high', 'trii'],
      ['high', 'djattawaa'],
      ['low', 'trii'],
      ['low', 'djattawaa'],
    ] as [ConsonantClass, ToneMark][])(
      'rejects %s class + mai %s (mid class only)',
      (cls, mark) => {
        expect(() => computeTone(cls, 'live', 'long', mark)).toThrow(/mid class only/);
      },
    );
  });
});
