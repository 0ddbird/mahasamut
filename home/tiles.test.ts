/// <reference types="node" />
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LANGUAGES = ['thai', 'chinese', 'japanese', 'korean', 'vietnamese'] as const;
const file = (path: string) => new URL(path, import.meta.url);

/** The width and height written in a PNG's IHDR chunk. */
const pngSize = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

/** The width and height written in a WebP header, whichever its kind. */
const webpSize = (bytes: Buffer) => {
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8X') return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`Not a WebP image: ${kind}`);
};

describe('the language tiles', () => {
  it.each(LANGUAGES)('serve %s as a light WebP, the size of its source', (lang) => {
    const webp = file(`./tiles/${lang}.webp`);
    expect(existsSync(webp)).toBe(true);
    // The five PNG sources weigh about 1.5 MB together: too heavy for a home page.
    expect(statSync(webp).size).toBeLessThan(100_000);
    expect(webpSize(readFileSync(webp))).toEqual(
      pngSize(readFileSync(file(`./tiles-src/${lang}.png`))),
    );
  });
});
