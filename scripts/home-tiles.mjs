// Converts the home page's language tiles from their JPEG sources
// (home/tiles-src/<lang>.jpg) to the WebP files the page serves (home/tiles/).
// Run again with `npm run home:tiles` whenever a source changes.
// Quality 65: the watercolours' paper grain is costly, and at 82 most of them
// weighed over 100 KB.
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCES = new URL('../home/tiles-src/', import.meta.url);
const OUT = new URL('../home/tiles/', import.meta.url);

await mkdir(OUT, { recursive: true });
for (const name of (await readdir(SOURCES)).filter((n) => n.endsWith('.jpg'))) {
  const target = new URL(name.replace(/\.jpg$/, '.webp'), OUT);
  const { size } = await sharp(new URL(name, SOURCES).pathname)
    .webp({ quality: 65, effort: 6 })
    .toFile(target.pathname);
  console.log(`${name} -> ${name.replace(/\.jpg$/, '.webp')} (${Math.round(size / 1024)} KB)`);
}
