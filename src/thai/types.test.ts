import { describe, expect, it } from 'vitest';
import {
  CONSONANT_CLASSES,
  FINAL_KINDS,
  FINAL_SOUNDS,
  LIVENESSES,
  TONE_MARKS,
  TONES,
  VOWEL_IDS,
  VOWEL_LENGTHS,
} from './types';

describe('runtime lists of values', () => {
  it('lists the 24 simple vowels, short then long for each pair', () => {
    expect(VOWEL_IDS).toEqual([
      'a', 'aa', 'i', 'ii', 'ue', 'uee', 'u', 'uu',
      'e', 'ee', 'ae', 'aee', 'o', 'oo', 'or', 'oor',
      'oe', 'oee', 'ia', 'iia', 'uea', 'ueea', 'ua', 'uua',
    ]);
  });

  it('lists the three consonant classes', () => {
    expect(CONSONANT_CLASSES).toEqual(['high', 'mid', 'low']);
  });

  it('lists the eight final sounds, stops first', () => {
    expect(FINAL_SOUNDS).toEqual(['k', 't', 'p', 'm', 'n', 'ng', 'y', 'w']);
  });

  it('lists the three kinds of final', () => {
    expect(FINAL_KINDS).toEqual(['none', 'sonorant', 'stop']);
  });

  it('lists the two vowel lengths', () => {
    expect(VOWEL_LENGTHS).toEqual(['short', 'long']);
  });

  it('lists live and dead', () => {
    expect(LIVENESSES).toEqual(['live', 'dead']);
  });

  it('lists "none" and the four tone marks, in alphabet order', () => {
    expect(TONE_MARKS).toEqual(['none', 'eek', 'thoo', 'trii', 'djattawaa']);
  });

  it('lists the five tones', () => {
    expect(TONES).toEqual(['mid', 'low', 'falling', 'high', 'rising']);
  });
});
