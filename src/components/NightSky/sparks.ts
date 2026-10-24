/** One spark of the night sky: where it starts, how it looks, how it moves. */
export interface Spark {
  /** Where it starts, in % of the box it is scattered over. */
  x: number;
  y: number;
  /** Its size, in px. */
  size: number;
  /** Its colour: most are the gold of the lanterns, a few are paler. */
  tone: 'gold' | 'pale' | 'white';
  /** How far the wind carries it, in px: mostly sideways, a little upwards. */
  dx: number;
  dy: number;
  /** The length of one flight and of one twinkle, in s. */
  drift: number;
  twinkle: number;
  /** Where in its flight it starts, in s, so that they are not in step. */
  delay: number;
}

/** Where a set of sparks starts, how far the wind takes them, and how big they are. */
export interface SparkArea {
  x: [number, number];
  y: [number, number];
  dx: [number, number];
  dy: [number, number];
  size: [number, number];
  drift: [number, number];
}

// A small seeded generator: the sparks are scattered at random, but the same
// way on every visit, and in the tests.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sparks scattered over an area, the same on every visit for the same seed. */
export function makeSparks(count: number, area: SparkArea, seed: number): Spark[] {
  const random = seeded(seed);
  const within = ([min, max]: [number, number]) => min + random() * (max - min);
  return Array.from({ length: count }, () => {
    const roll = random();
    const drift = within(area.drift);
    return {
      x: within(area.x),
      y: within(area.y),
      // One in seven is a larger ember.
      size: roll < 0.15 ? within(area.size) * 1.6 : within(area.size),
      tone: roll < 0.7 ? 'gold' : roll < 0.9 ? 'pale' : 'white',
      dx: within(area.dx),
      dy: within(area.dy),
      drift,
      twinkle: within([2.5, 6]),
      delay: -within([0, drift]),
    };
  });
}
