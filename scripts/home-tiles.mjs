// Converts the home page's language tiles from their PNG sources
// (home/tiles-src/<lang>.png) to the WebP files the page serves (home/tiles/).
// Run again with `npm run home:tiles` whenever a source changes.
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCES = new URL('../home/tiles-src/', import.meta.url);
const OUT = new URL('../home/tiles/', import.meta.url);

await mkdir(OUT, { recursive: true });
for (const name of (await readdir(SOURCES)).filter((n) => n.endsWith('.png'))) {
  const target = new URL(name.replace(/\.png$/, '.webp'), OUT);
  const { size } = await sharp(new URL(name, SOURCES).pathname)
    .webp({ quality: 82 })
    .toFile(target.pathname);
  console.log(`${name} -> ${name.replace(/\.png$/, '.webp')} (${Math.round(size / 1024)} KB)`);
}
