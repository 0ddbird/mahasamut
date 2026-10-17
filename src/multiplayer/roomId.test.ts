import { describe, expect, it } from 'vitest';
import { seededRng } from '../thai/generator/seeded-rng.test-utils';
import { generateRoomId, normalizeRoomId, ROOM_ID_ALPHABET } from './roomId';

describe('generateRoomId', () => {
  it('generates 6 characters from the alphabet', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 100; i++) {
      expect(generateRoomId(rng)).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('has no ambiguous characters', () => {
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(ROOM_ID_ALPHABET).not.toContain(ambiguous);
    }
  });
});

describe('normalizeRoomId', () => {
  it('normalizes what the player types', () => {
    expect(normalizeRoomId(' k7p 2qx ')).toBe('K7P2QX');
  });

  it('rejects a wrong length or a character outside the alphabet', () => {
    expect(normalizeRoomId('K7P2Q')).toBeNull();
    expect(normalizeRoomId('K7P2QXX')).toBeNull();
    expect(normalizeRoomId('K7P2Q0')).toBeNull();
    expect(normalizeRoomId(42)).toBeNull();
  });
});
