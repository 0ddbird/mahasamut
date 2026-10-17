import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isAllowed, parseGameSettings } from './settings';
import type { GameSettings } from './settings';

const SERIES_OF_10: GameSettings = {
  questionCount: 10,
  secondsPerQuestion: 15,
  answerMode: 'toneOnly',
};

describe('DEFAULT_SETTINGS', () => {
  it('starts from the current game: endless, free time, full reasoning', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      questionCount: null,
      secondsPerQuestion: null,
      answerMode: 'detailed',
    });
  });
});

describe('parseGameSettings', () => {
  it('reads valid settings', () => {
    expect(parseGameSettings(SERIES_OF_10)).toEqual(SERIES_OF_10);
  });

  it('falls back to the default of each setting, one by one', () => {
    expect(
      parseGameSettings({ questionCount: 4, secondsPerQuestion: 15, answerMode: 'x' }),
    ).toEqual({ questionCount: null, secondsPerQuestion: 15, answerMode: 'detailed' });
    for (const questionCount of [31, 10.5, '10']) {
      expect(parseGameSettings({ ...SERIES_OF_10, questionCount }).questionCount).toBeNull();
    }
    expect(
      parseGameSettings({ ...SERIES_OF_10, secondsPerQuestion: 12 }).secondsPerQuestion,
    ).toBeNull();
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
        const settings = { ...DEFAULT_SETTINGS, questionCount, secondsPerQuestion };
        expect(isAllowed(settings, 'solo')).toBe(true);
      }
    }
  });

  it('allows only timed series in multiplayer', () => {
    expect(isAllowed(SERIES_OF_10, 'multi')).toBe(true);
    expect(isAllowed({ ...SERIES_OF_10, questionCount: null }, 'multi')).toBe(false);
    expect(isAllowed({ ...SERIES_OF_10, secondsPerQuestion: null }, 'multi')).toBe(false);
  });
});
