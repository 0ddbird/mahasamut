/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from the disk: Vitest empties style files, even imported with ?raw.
const TOKENS = readFileSync(new URL('./tokens.scss', import.meta.url), 'utf8');

/** The opaque colours of tokens.scss, by name without the leading dashes. */
const COLORS = new Map(
  [...TOKENS.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex]),
);

/** The relative luminance of a `#rrggbb` colour, as WCAG defines it. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Every text colour with the background it is read on. */
const PAIRS: [text: string, background: string][] = [
  ['color-text', 'color-background'],
  ['color-text', 'color-glow'],
  ['color-text', 'color-surface-raised'],
  ['color-text-muted', 'color-background'],
  ['color-accent-text', 'color-accent'],
  ['color-accent-light', 'color-background'],
  ['color-accent-light', 'color-glow'],
  ['color-right', 'color-right-background'],
  ['color-wrong-text', 'color-wrong-background'],
  ['color-right', 'color-background'],
  ['color-wrong', 'color-background'],
  ['color-help-text', 'color-help-blue'],
  ['color-help-text', 'color-help-purple'],
  ['color-help-text', 'color-help-orange'],
];

/** The accent is yellow: light enough to stand out on the green-tinted page. */
const isYellow = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return r! > 200 && g! > 160 && b! < r! - 80;
};

describe('colour tokens', () => {
  // Otherwise a renamed token would drop out of the checks below unnoticed.
  it('define every colour the contrast checks read', () => {
    const missing = PAIRS.flat().filter((name) => !COLORS.has(name));
    expect(missing).toEqual([]);
  });

  it('make the accent yellow, its text on it dark', () => {
    expect(isYellow(COLORS.get('color-accent')!)).toBe(true);
    expect(isYellow(COLORS.get('color-accent-light')!)).toBe(true);
    expect(luminance(COLORS.get('color-accent-text')!)).toBeLessThan(0.1);
  });

  it('mark a right answer in yellow, like the accent', () => {
    expect(isYellow(COLORS.get('color-right')!)).toBe(true);
  });

  // A dark red tint melts into the green-tinted page: a wrong answer is solid red.
  it('mark a wrong answer in a solid red', () => {
    const [r, g, b] = [1, 3, 5].map((start) =>
      parseInt(COLORS.get('color-wrong-background')!.slice(start, start + 2), 16),
    );
    expect(r).toBeGreaterThan(180);
    expect(Math.max(g!, b!)).toBeLessThan(r! / 2);
  });

  it.each(PAIRS)('%s reads on %s at WCAG AA (4.5:1)', (text, background) => {
    expect(contrast(COLORS.get(text)!, COLORS.get(background)!)).toBeGreaterThanOrEqual(4.5);
  });
});
