import { describe, expect, it } from 'vitest';
import { vowelSoundUrl } from '../games/vowel/sounds';
import { VOWEL } from '../thai/types';
import type { RecapRoundView } from './protocol';
import { roundEntry } from './recap';

const NO_SOUND = () => null;

describe('roundEntry', () => {
  it('lists a wrong vowel answer in IPA between slashes, as in solo', () => {
    const round: RecapRoundView = {
      question: { game: 'vowel', text: 'อะ', choices: ['a', 'aː'] },
      reveal: { game: 'vowel', vowelId: VOWEL.A, expected: 'a' },
      answer: { game: 'vowel', sound: 'aː' },
      correct: false,
    };

    expect(roundEntry(round, NO_SOUND)).toEqual({
      game: 'vowel',
      questionId: 'a',
      text: 'อะ',
      result: 'wrong',
      given: '/aː/',
      expected: '/a/',
      sound: vowelSoundUrl(VOWEL.A),
    });
  });

  it('lists a consonant class question left unanswered as time up', () => {
    const round: RecapRoundView = {
      question: { game: 'consonantClass', text: 'ฎ' },
      reveal: { game: 'consonantClass', consonantClass: 'mid' },
      answer: null,
      correct: false,
    };

    expect(roundEntry(round, NO_SOUND)).toEqual({
      game: 'consonantClass',
      questionId: 'ฎ',
      text: 'ฎ',
      result: 'timeUp',
      given: null,
      expected: 'Mid',
      sound: null,
    });
  });

  it('lists a right word with the sound the lookup gives', () => {
    const round: RecapRoundView = {
      question: { game: 'syllable', text: 'น้ำ' },
      reveal: {
        game: 'syllable',
        analyses: [
          {
            consonantClass: 'low',
            vowelLength: 'long',
            finalKind: 'sonorant',
            liveness: 'live',
            tone: 'high',
          },
        ],
        mark: 'thoo',
      },
      answer: { game: 'syllable', answers: { tone: 'high' } },
      correct: true,
    };

    expect(roundEntry(round, (text) => `/audio/words/${text}.mp3`)).toEqual({
      game: 'syllable',
      questionId: 'น้ำ',
      text: 'น้ำ',
      result: 'right',
      given: 'High',
      expected: 'High',
      sound: '/audio/words/น้ำ.mp3',
    });
  });
});
