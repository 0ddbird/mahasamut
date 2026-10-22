/**
 * Thai-themed player avatars for multiplayer lobbies, rankings, and podiums.
 *
 * Each avatar has a stable ID and an SVG asset at `/avatars/<id>.svg` (served
 * from `public/avatars/`), so placeholder illustrations can be swapped out for
 * custom artwork without changing code.
 */
import type { Rng } from '../thai/generator';

export const AVATAR_IDS = [
  'elephant',
  'tiger',
  'monkey',
  'coconut',
  'lantern',
  'lotus',
  'tuktuk',
  'chili',
  'mango',
  'cat',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const AVATAR_LABELS: Record<AvatarId, string> = {
  elephant: 'Elephant',
  tiger: 'Tiger',
  monkey: 'Monkey',
  coconut: 'Coconut',
  lantern: 'Floating lantern',
  lotus: 'Lotus',
  tuktuk: 'Tuk-tuk',
  chili: 'Chili',
  mango: 'Mango',
  cat: 'Siamese cat',
};

const AVATAR_SET = new Set<string>(AVATAR_IDS);

export function isAvatarId(raw: unknown): raw is AvatarId {
  return typeof raw === 'string' && AVATAR_SET.has(raw);
}

/**
 * Picks a random avatar, preferring one not already taken in the lobby when
 * possible.
 */
export function pickRandomAvatar(rng: Rng, taken: readonly AvatarId[] = []): AvatarId {
  const takenSet = new Set(taken);
  const available = AVATAR_IDS.filter((id) => !takenSet.has(id));
  const pool = available.length > 0 ? available : AVATAR_IDS;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

/**
 * Returns the previous (`-1`) or next (`+1`) avatar in the circular list.
 */
export function cycleAvatar(current: AvatarId, step: 1 | -1): AvatarId {
  const index = AVATAR_IDS.indexOf(current);
  const nextIndex = (index + step + AVATAR_IDS.length) % AVATAR_IDS.length;
  return AVATAR_IDS[nextIndex];
}
