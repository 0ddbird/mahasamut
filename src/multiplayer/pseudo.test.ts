import { describe, expect, it } from 'vitest';
import { normalizePseudo, pseudoKey } from './pseudo';

describe('normalizePseudo', () => {
  it('trims the pseudo', () => {
    expect(normalizePseudo('  Marie ')).toBe('Marie');
  });

  it('accepts 1 to 20 characters, Thai included', () => {
    expect(normalizePseudo('ก')).toBe('ก');
    expect(normalizePseudo('a'.repeat(20))).toBe('a'.repeat(20));
    expect(normalizePseudo('สมชาย')).toBe('สมชาย');
    expect(normalizePseudo('a'.repeat(21))).toBeNull();
    expect(normalizePseudo('   ')).toBeNull();
  });

  it('counts characters, not UTF-16 units', () => {
    // Each emoji is two UTF-16 units: 40 units, 20 characters.
    const emojis = '😀'.repeat(20);
    expect(normalizePseudo(emojis)).toBe(emojis);
  });

  it('rejects control characters and non-strings', () => {
    expect(normalizePseudo('a\nb')).toBeNull();
    expect(normalizePseudo('a\u0000')).toBeNull();
    expect(normalizePseudo(42)).toBeNull();
    expect(normalizePseudo(undefined)).toBeNull();
  });
});

describe('pseudoKey', () => {
  it('ignores case', () => {
    expect(pseudoKey('Marie')).toBe(pseudoKey('mARIE'));
  });
});
