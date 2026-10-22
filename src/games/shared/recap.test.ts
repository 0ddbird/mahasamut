import { describe, expect, it } from 'vitest';
import { VOWEL } from '../../thai/types';
import { vowelSoundUrl } from '../vowel/sounds';
import { consonantClassEntry, syllableEntry, vowelEntry } from './recap';

describe('vowelEntry', () => {
  it('labels the sounds in IPA between slashes, with the vowel sound', () => {
    expect(vowelEntry(VOWEL.A, 'อะ', 'aː', 'wrong')).toEqual({
      game: 'vowel',
      questionId: 'a',
      text: 'อะ',
      result: 'wrong',
      given: '/aː/',
      expected: '/a/',
      sound: vowelSoundUrl(VOWEL.A),
    });
  });

  it('drops the answer chosen when the time ran out', () => {
    expect(vowelEntry(VOWEL.A, 'อะ', 'aː', 'timeUp').given).toBeNull();
  });
});

describe('consonantClassEntry', () => {
  it('labels the classes, names the question by the consonant, and has no sound', () => {
    expect(consonantClassEntry('ฎ', 'mid', 'low', 'wrong')).toEqual({
      game: 'consonantClass',
      questionId: 'ฎ',
      text: 'ฎ',
      result: 'wrong',
      given: 'Low',
      expected: 'Mid',
      sound: null,
    });
  });
});

describe('syllableEntry', () => {
  it('labels the tones and keeps the sound given', () => {
    expect(syllableEntry('น้ำ', 'high', 'falling', 'wrong', '/audio/words/x.mp3')).toEqual({
      game: 'syllable',
      questionId: 'น้ำ',
      text: 'น้ำ',
      result: 'wrong',
      given: 'Falling',
      expected: 'High',
      sound: '/audio/words/x.mp3',
    });
  });

  it('keeps no answer when none was given', () => {
    expect(syllableEntry('มา', 'mid', null, 'timeUp', null).given).toBeNull();
  });
});
