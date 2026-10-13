/**
 * Test utility: a seeded random number generator, so that tests always see the
 * same syllables and a failure can be replayed. The game uses `Math.random`.
 */

/**
 * A seeded random number generator (mulberry32): the same seed always gives
 * the same sequence of numbers in [0, 1), like `Math.random`.
 *
 * @see https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // The bit mixing below is mulberry32 as published.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const uint32 = (t ^ (t >>> 14)) >>> 0;
    return uint32 / 2 ** 32;
  };
}
