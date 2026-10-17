import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import type { GameSettings } from './settings';
import { settingsFromSearch, settingsToSearch } from './settingsUrl';

const TIMED_SERIES: GameSettings = {
  questionCount: 10,
  secondsPerQuestion: 15,
  answerMode: 'toneOnly',
};

describe('settingsToSearch', () => {
  it('writes nothing for the default settings', () => {
    expect(settingsToSearch(DEFAULT_SETTINGS)).toBe('');
  });

  it('writes the settings that differ from the defaults', () => {
    expect(settingsToSearch(TIMED_SERIES)).toBe('count=10&time=15&answer=toneOnly');
    expect(settingsToSearch({ ...DEFAULT_SETTINGS, secondsPerQuestion: 30 })).toBe('time=30');
  });
});

describe('settingsFromSearch', () => {
  it('reads back what it writes', () => {
    const combinations: GameSettings[] = [
      DEFAULT_SETTINGS,
      TIMED_SERIES,
      { ...DEFAULT_SETTINGS, questionCount: 30 },
    ];
    for (const settings of combinations) {
      expect(settingsFromSearch(new URLSearchParams(settingsToSearch(settings)))).toEqual(settings);
    }
  });

  it('falls back to the defaults on a bad parameter', () => {
    expect(settingsFromSearch(new URLSearchParams('count=abc&time=12&answer=x'))).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});
