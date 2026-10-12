import { describe, expect, it } from 'vitest';
import { CONSONANTS } from './index';
import { finalKind, finalSound, liveness } from './finals';
import type { FinalKind, FinalSound, Liveness, VowelLength } from '../types';

const LETTERS_BY_SOUND: [FinalSound, string[]][] = [
  ['k', ['ก', 'ข', 'ค', 'ฆ']],
  ['t', ['จ', 'ช', 'ซ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'ศ', 'ษ', 'ส']],
  ['p', ['บ', 'ป', 'พ', 'ฟ', 'ภ']],
  ['m', ['ม']],
  ['n', ['น', 'ญ', 'ณ', 'ร', 'ล', 'ฬ']],
  ['ng', ['ง']],
  ['y', ['ย']],
  ['w', ['ว']],
];

const CANNOT_BE_FINAL = ['ฉ', 'ฌ', 'ผ', 'ฝ', 'ห', 'อ', 'ฮ'];

const KIND_BY_SOUND: [FinalSound | null, FinalKind][] = [
  [null, 'none'],
  ['m', 'sonorant'],
  ['n', 'sonorant'],
  ['ng', 'sonorant'],
  ['y', 'sonorant'],
  ['w', 'sonorant'],
  ['k', 'stop'],
  ['t', 'stop'],
  ['p', 'stop'],
];

describe('finalSound', () => {
  for (const [sound, letters] of LETTERS_BY_SOUND) {
    it.each(letters)(`%s as a final sounds /${sound}/`, (letter) => {
      expect(finalSound(letter)).toBe(sound);
    });
  }

  it.each(CANNOT_BE_FINAL)('rejects %s, which cannot be a final consonant', (letter) => {
    expect(() => finalSound(letter)).toThrow(/cannot be a final consonant/);
  });

  it.each(['ฃ', 'า', 'x'])('rejects %s, which is not a supported consonant', (letter) => {
    expect(() => finalSound(letter)).toThrow(/Unknown consonant/);
  });

  it('accounts for every consonant: 35 can be finals, 7 cannot', () => {
    const finals = CONSONANTS.filter((c) => !CANNOT_BE_FINAL.includes(c.char));
    expect(finals).toHaveLength(35);
    expect(CANNOT_BE_FINAL).toHaveLength(7);
    for (const c of finals) expect(() => finalSound(c.char)).not.toThrow();
  });
});

describe('finalKind', () => {
  it.each(KIND_BY_SOUND)('final sound %s → %s', (sound, kind) => {
    expect(finalKind(sound)).toBe(kind);
  });
});

describe('liveness', () => {
  const CASES: [FinalKind, VowelLength, Liveness][] = [
    ['none', 'short', 'dead'],
    ['none', 'long', 'live'],
    ['sonorant', 'short', 'live'],
    ['sonorant', 'long', 'live'],
    ['stop', 'short', 'dead'],
    ['stop', 'long', 'dead'],
  ];

  it.each(CASES)('%s final + %s vowel → %s', (kind, length, expected) => {
    expect(liveness(kind, length)).toBe(expected);
  });
});
