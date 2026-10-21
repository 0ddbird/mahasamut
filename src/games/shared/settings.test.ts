import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isAllowed, parseGameSettings } from './settings';
import type { GameSettings } from './settings';

const SERIES_OF_10: GameSettings = {
  questionCount: 10,
  secondsPerQuestion: 15,
  answerMode: 'toneOnly',
  learningMode: false,
};

describe('DEFAULT_SETTINGS', () => {
  it('starts from the current game: endless, free time, full reasoning, no help', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      questionCount: null,
      secondsPerQuestion: null,
      answerMode: 'detailed',
      learningMode: false,
    });
  });
});

describe('parseGameSettings', () => {
  it('reads valid settings', () => {
    expect(parseGameSettings(SERIES_OF_10)).toEqual(SERIES_OF_10);
    expect(parseGameSettings({ ...SERIES_OF_10, learningMode: true }).learningMode).toBe(true);
  });

  it('falls back to the default of each setting, one by one', () => {
    expect(
      parseGameSettings({
        questionCount: 4,
        secondsPerQuestion: 15,
        answerMode: 'x',
        learningMode: 'yes',
      }),
    ).toEqual({
      questionCount: null,
      secondsPerQuestion: 15,
      answerMode: 'detailed',
      learningMode: false,
    });
    for (const questionCount of [31, 10.5, '10']) {
      expect(parseGameSettings({ ...SERIES_OF_10, questionCount }).questionCount).toBeNull();
    }
    for (const secondsPerQuestion of [0, 61, 1.5, '15']) {
      expect(
        parseGameSettings({ ...SERIES_OF_10, secondsPerQuestion }).secondsPerQuestion,
      ).toBeNull();
    }
  });

  it('reads any whole number of seconds from 1 to 60', () => {
    for (const secondsPerQuestion of [1, 12, 60]) {
      expect(parseGameSettings({ ...SERIES_OF_10, secondsPerQuestion }).secondsPerQuestion).toBe(
        secondsPerQuestion,
      );
    }
  });

  it('reads settings saved before the learning mode existed', () => {
    const { learningMode: _learningMode, ...older } = SERIES_OF_10;
    expect(parseGameSettings(older)).toEqual(SERIES_OF_10);
  });

  it('reads anything that is not an object as the defaults', () => {
    for (const raw of [null, 'x', [], undefined]) {
      expect(parseGameSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });
});

describe('isAllowed', () => {
  it('allows every combination in solo', () => {
    for (const questionCount of [null, 10]) {
      for (const secondsPerQuestion of [null, 15] as const) {
        for (const learningMode of [false, true]) {
          const settings = { ...DEFAULT_SETTINGS, questionCount, secondsPerQuestion, learningMode };
          expect(isAllowed(settings, 'solo')).toBe(true);
        }
      }
    }
  });

  it('allows only timed series without help in multiplayer', () => {
    expect(isAllowed(SERIES_OF_10, 'multi')).toBe(true);
    expect(isAllowed({ ...SERIES_OF_10, questionCount: null }, 'multi')).toBe(false);
    expect(isAllowed({ ...SERIES_OF_10, secondsPerQuestion: null }, 'multi')).toBe(false);
    expect(isAllowed({ ...SERIES_OF_10, learningMode: true }, 'multi')).toBe(false);
  });
});
