import { describe, expect, it } from 'vitest';
import { parseRoomSettings } from './settings';

const VALID = { game: 'syllable', secondsPerQuestion: 15, questionCount: 10 };

describe('parseRoomSettings', () => {
  it('accepts valid settings for any of the three games', () => {
    expect(parseRoomSettings(VALID)).toEqual({
      game: 'syllable',
      secondsPerQuestion: 15,
      questionCount: 10,
      answerMode: 'detailed',
      password: null,
    });
    expect(parseRoomSettings({ ...VALID, game: 'vowel' })?.game).toBe('vowel');
    expect(parseRoomSettings({ ...VALID, game: 'consonantClass' })?.game).toBe('consonantClass');
  });

  it('accepts tone-only mode in the syllable game', () => {
    expect(parseRoomSettings({ ...VALID, answerMode: 'toneOnly' })?.answerMode).toBe('toneOnly');
  });

  it('accepts any whole time from 1 to 60 seconds', () => {
    expect(parseRoomSettings({ ...VALID, secondsPerQuestion: 1 })?.secondsPerQuestion).toBe(1);
    expect(parseRoomSettings({ ...VALID, secondsPerQuestion: 60 })?.secondsPerQuestion).toBe(60);
  });

  it('keeps a password, and reads an empty one as none', () => {
    expect(parseRoomSettings({ ...VALID, password: 'abc' })?.password).toBe('abc');
    expect(parseRoomSettings({ ...VALID, password: '' })?.password).toBeNull();
    expect(parseRoomSettings({ password: 'abc' })).toEqual({
      game: 'syllable',
      secondsPerQuestion: 15,
      questionCount: 10,
      answerMode: 'detailed',
      password: 'abc',
    });
  });

  it('rejects an unknown game, a time or a count out of range, or an unknown answer mode', () => {
    expect(parseRoomSettings({ ...VALID, game: 'tones' })).toBeNull();
    expect(parseRoomSettings({ ...VALID, secondsPerQuestion: 0 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, secondsPerQuestion: 61 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, secondsPerQuestion: 12.5 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, questionCount: 4 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, questionCount: 31 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, questionCount: 10.5 })).toBeNull();
    expect(parseRoomSettings({ ...VALID, answerMode: 'wrong' })).toBeNull();
  });

  it('rejects a password longer than 64 characters, or not a string', () => {
    expect(parseRoomSettings({ ...VALID, password: 'x'.repeat(65) })).toBeNull();
    expect(parseRoomSettings({ ...VALID, password: 42 })).toBeNull();
  });

  it('rejects anything that is not an object', () => {
    expect(parseRoomSettings(null)).toBeNull();
    expect(parseRoomSettings('syllable')).toBeNull();
    expect(parseRoomSettings([])).toBeNull();
  });
});
