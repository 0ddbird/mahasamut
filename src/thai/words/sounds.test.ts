import { describe, expect, it } from 'vitest';
import pool from './pool.json';
import soundList from './sounds.json';
import { wordSoundUrl } from './sounds';

// Empty until the first words are validated: typed as strings all the same.
const withSound: readonly string[] = soundList;

describe('wordSoundUrl', () => {
  it('serves a word with a sound under its id', () => {
    for (const text of withSound) {
      expect(wordSoundUrl(text)).toMatch(/\/audio\/words\/[0-9a-f]{4}(-[0-9a-f]{4})*\.mp3$/);
    }
  });

  it('gives no sound to a word without one', () => {
    const silent = pool.find((text) => !withSound.includes(text));
    expect(silent).toBeDefined();
    expect(wordSoundUrl(silent!)).toBeNull();
    expect(wordSoundUrl('not a word')).toBeNull();
  });

  // A sound for a word the game never draws would be dead weight in the site.
  it('only lists words of the pool', () => {
    const inPool = new Set(pool);
    expect(withSound.filter((text) => !inPool.has(text))).toEqual([]);
  });
});
