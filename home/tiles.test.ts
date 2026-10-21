/// <reference types="node" />
import { existsSync, readFileSync, statSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const LANGUAGES = ['thai', 'chinese', 'japanese', 'korean', 'vietnamese'] as const;
const file = (path: string) => new URL(path, import.meta.url);

/** The width and height written in a JPEG's start-of-frame segment. */
const jpegSize = (bytes: Buffer) => {
  for (let at = 2; at + 9 < bytes.length; at += 2 + bytes.readUInt16BE(at + 2)) {
    const marker = bytes[at + 1]!;
    // SOF0 to SOF15, but for DHT (C4), JPG (C8) and DAC (CC), which share the range.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [bytes.readUInt16BE(at + 7), bytes.readUInt16BE(at + 5)];
    }
  }
  throw new Error('Not a JPEG image');
};

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
    // The five JPEG sources weigh about 1 MB together: too heavy for a home page.
    expect(statSync(webp).size).toBeLessThan(100_000);
    expect(webpSize(readFileSync(webp))).toEqual(
      jpegSize(readFileSync(file(`./tiles-src/${lang}.jpg`))),
    );
  });

  // The page keeps each picture's place before it loads: at the picture's own size.
  it("give the page each picture's size", () => {
    const page = new JSDOM(readFileSync(file('./index.html'), 'utf8')).window.document;
    for (const lang of LANGUAGES) {
      const image = page.querySelector(`[data-language="${lang}"] img`)!;
      expect(
        [Number(image.getAttribute('width')), Number(image.getAttribute('height'))],
        lang,
      ).toEqual(webpSize(readFileSync(file(`./tiles/${lang}.webp`))));
    }
  });
});
