import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import {
  ANSWER_MODE_OPTIONS,
  describeSettings,
  LENGTH_OPTIONS,
  TIME_OPTIONS,
} from './settingsLabels';

describe('describeSettings', () => {
  it('describes the default settings', () => {
    expect(describeSettings(DEFAULT_SETTINGS, true)).toBe('Endless · Free time · Full reasoning');
    expect(describeSettings(DEFAULT_SETTINGS, false)).toBe('Endless · Free time');
  });

  it('describes a timed series in tone-only mode', () => {
    const settings = { questionCount: 10, secondsPerQuestion: 15, answerMode: 'toneOnly' } as const;
    expect(describeSettings(settings, true)).toBe('Series of 10 · 15 s per question · Tone only');
  });
});

describe('the choices of the settings page', () => {
  it('offers an endless game or a series', () => {
    expect(LENGTH_OPTIONS.map((option) => option.label)).toEqual(['Endless', 'Series']);
  });

  it('offers free time or each time per question, in one row', () => {
    expect(TIME_OPTIONS.map((option) => option.label)).toEqual([
      'Free',
      '10 s',
      '15 s',
      '20 s',
      '30 s',
    ]);
  });

  it('offers the full reasoning or the tone alone', () => {
    expect(ANSWER_MODE_OPTIONS.map((option) => option.label)).toEqual([
      'Full reasoning',
      'Tone only',
    ]);
  });
});
