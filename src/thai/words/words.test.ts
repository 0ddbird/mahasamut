import { describe, expect, it } from 'vitest';
import { validSyllables } from '../generator/syllables';
import pool from './pool.json';
import { wordGroups, wordSyllables } from './index';

describe('the pool', () => {
  it('is not empty', () => {
    expect(pool.length).toBeGreaterThan(0);
  });

  it('holds only texts that the generator writes', () => {
    const written = new Set(validSyllables().map((syllable) => syllable.text));
    expect(pool.filter((text) => !written.has(text))).toEqual([]);
  });

  it('holds no text twice', () => {
    expect(new Set(pool).size).toBe(pool.length);
  });
});

describe('wordSyllables', () => {
  it('holds every pool text', () => {
    const texts = new Set(wordSyllables().map((syllable) => syllable.text));
    expect(pool.filter((text) => !texts.has(text))).toEqual([]);
  });

  it('holds only pool texts', () => {
    const inPool = new Set(pool);
    expect(wordSyllables().filter((syllable) => !inPool.has(syllable.text))).toEqual([]);
  });

  it('is computed once', () => {
    expect(wordSyllables()).toBe(wordSyllables());
  });
});

describe('wordGroups', () => {
  it('holds the syllables of wordSyllables, once each', () => {
    const grouped = wordGroups().flatMap((group) => group.syllables);
    expect(grouped).toHaveLength(wordSyllables().length);
    expect(new Set(grouped)).toEqual(new Set(wordSyllables()));
  });

  it('is computed once', () => {
    expect(wordGroups()).toBe(wordGroups());
  });
});
