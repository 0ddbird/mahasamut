// A .tsx file, so that it runs in jsdom, which has a localStorage.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME } from './games';
import { DEFAULT_SETTINGS } from './settings';
import type { GameSettings } from './settings';
import { loadSettings, saveSettings } from './settingsStorage';

const SERIES_OF_10: GameSettings = {
  questionCount: 10,
  secondsPerQuestion: null,
  answerMode: 'detailed',
  learningMode: true,
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('loadSettings', () => {
  it('returns the defaults the first time', () => {
    expect(loadSettings(GAME.Syllable)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the settings of each game apart', () => {
    saveSettings(GAME.Syllable, SERIES_OF_10);
    expect(loadSettings(GAME.ConsonantClass)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(GAME.Syllable)).toEqual(SERIES_OF_10);
  });

  it('ignores what it cannot read, setting by setting', () => {
    localStorage.setItem('mahasamut.settings.syllable', '{oops');
    expect(loadSettings(GAME.Syllable)).toEqual(DEFAULT_SETTINGS);

    localStorage.setItem('mahasamut.settings.syllable', '{"questionCount":10,"answerMode":"x"}');
    expect(loadSettings(GAME.Syllable)).toEqual({
      questionCount: 10,
      secondsPerQuestion: null,
      answerMode: 'detailed',
      learningMode: false,
    });
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(loadSettings(GAME.Syllable)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(GAME.Syllable, SERIES_OF_10)).not.toThrow();
  });
});
