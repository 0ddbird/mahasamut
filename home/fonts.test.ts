/// <reference types="node" />
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cut, FONTS } from '../scripts/home-fonts.mjs';

describe('the fonts of the names over the pictures', () => {
  it.each(FONTS)('serve %s in a font of a few kilobytes', (_lang, file) => {
    const font = new URL(`./fonts/${file}.woff2`, import.meta.url);
    expect(existsSync(font)).toBe(true);
    expect(statSync(font).size).toBeLessThan(10_000);
  });

  // A name changed without running `npm run home:fonts` would show its new
  // characters in a fallback font.
  it.each(FONTS)("hold exactly the characters of today's %s name", async (lang, file) => {
    expect(Buffer.from(await cut(lang))).toEqual(
      readFileSync(new URL(`./fonts/${file}.woff2`, import.meta.url)),
    );
  });
});
