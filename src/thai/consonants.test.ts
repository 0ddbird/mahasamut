import { describe, expect, it } from 'vitest';
import { CONSONANTS, consonant } from './consonants';

const MID = ['ก', 'จ', 'ฎ', 'ฏ', 'ด', 'ต', 'บ', 'ป', 'อ'];
const HIGH = ['ข', 'ฉ', 'ฐ', 'ถ', 'ผ', 'ฝ', 'ศ', 'ษ', 'ส', 'ห'];
const LOW = [
  'ค', 'ฆ', 'ง', 'ช', 'ซ', 'ฌ', 'ญ', 'ฑ', 'ฒ', 'ณ', 'ท', 'ธ',
  'น', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ฬ', 'ฮ',
];

describe('consonants', () => {
  it('contains 42 consonants with no duplicates', () => {
    expect(CONSONANTS).toHaveLength(42);
    expect(new Set(CONSONANTS.map((c) => c.char)).size).toBe(42);
  });

  it('splits classes into 9 mid, 10 high and 23 low', () => {
    const count = (cls: string) => CONSONANTS.filter((c) => c.consonantClass === cls).length;
    expect(count('mid')).toBe(9);
    expect(count('high')).toBe(10);
    expect(count('low')).toBe(23);
  });

  it.each(MID)('%s is mid class', (char) => {
    expect(consonant(char).consonantClass).toBe('mid');
  });

  it.each(HIGH)('%s is high class', (char) => {
    expect(consonant(char).consonantClass).toBe('high');
  });

  it.each(LOW)('%s is low class', (char) => {
    expect(consonant(char).consonantClass).toBe('low');
  });

  it.each(['ฃ', 'ฅ'])('excludes the obsolete consonant %s', (char) => {
    expect(() => consonant(char)).toThrow(/Unknown consonant/);
  });

  it.each(['ฤ', 'า', 'x', ''])('rejects anything that is not a supported consonant: %j', (char) => {
    expect(() => consonant(char)).toThrow(/Unknown consonant/);
  });
});
