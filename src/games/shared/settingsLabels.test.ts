import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import type { GameSettings } from './settings';
import {
  ANSWER_MODE_OPTIONS,
  describeSettings,
  LEARNING_MODE_OPTIONS,
  LENGTH_OPTIONS,
  TIME_OPTIONS,
} from './settingsLabels';

describe('describeSettings', () => {
  it('describes the default settings', () => {
    expect(describeSettings(DEFAULT_SETTINGS, true)).toBe('Endless · Free time · Full reasoning');
    expect(describeSettings(DEFAULT_SETTINGS, false)).toBe('Endless · Free time');
  });

  it('describes a timed series in tone-only mode', () => {
    const settings: GameSettings = {
      questionCount: 10,
      secondsPerQuestion: 15,
      answerMode: 'toneOnly',
      learningMode: false,
    };
    expect(describeSettings(settings, true)).toBe('Series of 10 · 15 s per question · Tone only');
  });

  it('says when the game was played in learning mode', () => {
    expect(describeSettings({ ...DEFAULT_SETTINGS, learningMode: true }, false)).toBe(
      'Endless · Free time · Learning mode',
    );
  });
});

describe('the choices of the settings page', () => {
  it('offers an endless game or a series', () => {
    expect(LENGTH_OPTIONS.map((option) => option.label)).toEqual(['Endless', 'Series']);
  });

  it('offers free time or a timed game, its seconds asked apart', () => {
    expect(TIME_OPTIONS.map((option) => option.label)).toEqual(['Free', 'Timed']);
  });

  it('offers the full reasoning or the tone alone', () => {
    expect(ANSWER_MODE_OPTIONS.map((option) => option.label)).toEqual([
      'Full reasoning',
      'Tone only',
    ]);
  });

  it('offers the learning mode off or on', () => {
    expect(LEARNING_MODE_OPTIONS.map((option) => option.label)).toEqual(['Off', 'On']);
  });
});
