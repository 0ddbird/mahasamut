// Cuts the fonts of the home page's Chinese, Japanese and Korean names down to
// the few characters those names show (home/fonts/<lang>.woff2): whole, the
// fonts weigh 0.4 to 1.5 MB each. Run again with `npm run home:fonts` whenever
// one of these names changes in home/index.html.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import subsetFont from 'subset-font';

const FONTSOURCE = new URL('../node_modules/@fontsource/', import.meta.url);
const OUT = new URL('../home/fonts/', import.meta.url);

/** Each name's language, the file it is cut into, and the font it is cut from. */
export const FONTS = [
  ['zh-Hans', 'chinese', 'noto-serif-sc/files/noto-serif-sc-chinese-simplified-700-normal.woff2'],
  ['ja', 'japanese', 'shippori-mincho/files/shippori-mincho-japanese-700-normal.woff2'],
  ['ko', 'korean', 'gowun-batang/files/gowun-batang-korean-700-normal.woff2'],
];

/** The name the home page writes in this language. */
const nameIn = (lang) => {
  const page = new JSDOM(readFileSync(new URL('../home/index.html', import.meta.url), 'utf8'));
  return page.window.document.querySelector(`.native[lang="${lang}"]`).textContent.trim();
};

/** The font for this language's name, holding that name's characters only. */
export const cut = (lang) => {
  const [, , source] = FONTS.find(([l]) => l === lang);
  return subsetFont(readFileSync(new URL(source, FONTSOURCE)), nameIn(lang), {
    targetFormat: 'woff2',
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(OUT, { recursive: true });
  for (const [lang, file] of FONTS) {
    const font = await cut(lang);
    await writeFile(new URL(`${file}.woff2`, OUT), font);
    console.log(`${nameIn(lang)} -> ${file}.woff2 (${(font.length / 1024).toFixed(1)} KB)`);
  }
}
