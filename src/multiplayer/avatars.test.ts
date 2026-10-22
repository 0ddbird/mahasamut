import { describe, expect, it } from 'vitest';
import { AVATAR_IDS, cycleAvatar, isAvatarId, pickRandomAvatar } from './avatars';

describe('avatars', () => {
  it('recognises valid Thai avatar IDs and rejects others', () => {
    for (const id of AVATAR_IDS) {
      expect(isAvatarId(id)).toBe(true);
    }
    expect(isAvatarId('dragon')).toBe(false);
    expect(isAvatarId(42)).toBe(false);
  });

  it('picks an unused avatar when some are already taken', () => {
    const taken = AVATAR_IDS.slice(0, -1);
    const chosen = pickRandomAvatar(() => 0, taken);
    expect(chosen).toBe(AVATAR_IDS[AVATAR_IDS.length - 1]);
  });

  it('cycles forward and backward around the avatar list', () => {
    const first = AVATAR_IDS[0];
    const last = AVATAR_IDS[AVATAR_IDS.length - 1];
    expect(cycleAvatar(first, -1)).toBe(last);
    expect(cycleAvatar(last, 1)).toBe(first);
    expect(cycleAvatar(first, 1)).toBe(AVATAR_IDS[1]);
  });
});
