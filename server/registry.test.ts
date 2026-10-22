import { describe, expect, it } from 'vitest';
import type { RoomSettings } from '../src/multiplayer/settings';
import { seededRng } from '../src/thai/generator/seeded-rng.test-utils';
import { IDLE_ROOM_MS, MAX_ROOMS } from './limits';
import { RoomRegistry } from './registry';

const SETTINGS: RoomSettings = {
  game: 'syllable',
  secondsPerQuestion: 15,
  questionCount: 5,
  answerMode: 'detailed',
  password: null,
};

describe('RoomRegistry', () => {
  it('creates rooms with distinct IDs', () => {
    const registry = new RoomRegistry(seededRng(1));
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const res = registry.create(SETTINGS, 'Host', 0);
      expect(res.ok).toBe(true);
      if (res.ok) {
        ids.add(res.room.id);
        expect(registry.get(res.room.id)).toBe(res.room);
      }
    }
    expect(ids.size).toBe(50);
    expect(registry.size).toBe(50);
  });

  it('draws another ID on a collision', () => {
    // Replays the first 6 random draws once, then advances normally.
    const base = seededRng(2);
    const firstSix = Array.from({ length: 6 }, () => base());
    const queue = [...firstSix, ...firstSix];
    const rng = () => queue.shift() ?? base();

    const registry = new RoomRegistry(rng);
    const first = registry.create(SETTINGS, 'Host', 0);
    const second = registry.create(SETTINGS, 'Host', 0);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.room.id).not.toBe(first.room.id);
    }
  });

  it('refuses a room past 200', () => {
    const registry = new RoomRegistry(seededRng(3));
    for (let i = 0; i < MAX_ROOMS; i++) {
      expect(registry.create(SETTINGS, 'Host', 0).ok).toBe(true);
    }
    expect(registry.create(SETTINGS, 'Host', 0)).toEqual({
      ok: false,
      error: 'server-full',
    });
  });

  it('removes the rooms idle for 30 minutes', () => {
    const registry = new RoomRegistry(seededRng(4));
    const created = registry.create(SETTINGS, 'Host', 0);
    if (!created.ok) throw new Error('expected room creation to succeed');
    const id = created.room.id;

    expect(registry.sweep(IDLE_ROOM_MS - 1)).toEqual([]);
    expect(registry.get(id)).toBeDefined();

    expect(registry.sweep(IDLE_ROOM_MS)).toEqual([id]);
    expect(registry.get(id)).toBeUndefined();
    expect(registry.size).toBe(0);
  });
});
