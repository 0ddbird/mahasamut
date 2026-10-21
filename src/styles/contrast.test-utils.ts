/**
 * Colour contrast for the tests that check a style sheet reads well: its opaque
 * custom properties, and the WCAG contrast ratio between two of them.
 */

/** The opaque colours a style sheet defines, by name without the leading dashes. */
export const opaqueColors = (styles: string) =>
  new Map(
    [...styles.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex]),
  );

/** The relative luminance of a `#rrggbb` colour, as WCAG defines it. */
export const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

/** The WCAG contrast ratio of two `#rrggbb` colours, from 1 to 21. */
export const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};
