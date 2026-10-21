/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { contrast, opaqueColors } from '../src/styles/contrast.test-utils';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const HTML = read('./index.html');
const page = new JSDOM(HTML).window.document;
const meta = (selector: string) => page.querySelector(selector)?.getAttribute('content');

const LANGUAGES = ['Thai', 'Chinese', 'Japanese', 'Korean', 'Vietnamese'];
const tiles = () => [...page.querySelectorAll('[data-language]')];

describe('the home page', () => {
  describe('for search engines and sharing', () => {
    it('is in English, titled, described, with its canonical address', () => {
      expect(page.documentElement.getAttribute('lang')).toBe('en');
      expect(page.title).toBe("Scriptomancy — Games to read the world's scripts");
      expect(meta('meta[name="description"]')?.trim().length).toBeGreaterThan(50);
      expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        'https://scriptomancy.com/',
      );
    });

    it('can be shared, with a title, a description, an address and a picture', () => {
      for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) {
        expect(meta(`meta[property="${property}"]`), property).toMatch(/\S/);
      }
      expect(meta('meta[property="og:url"]')).toBe('https://scriptomancy.com/');
      expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    });

    it('describes the site as a WebSite, in its only script', () => {
      const scripts = [...page.querySelectorAll('script')];
      expect(scripts.map((s) => s.getAttribute('type'))).toEqual(['application/ld+json']);
      const data = JSON.parse(scripts[0]!.textContent ?? '');
      expect(data).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Scriptomancy',
        url: 'https://scriptomancy.com/',
      });
    });

    // The root domain serves dist/home/ only, and /assets/: a file the page links
    // to by an absolute path must be in public/home/, or it is a 404 there.
    it('finds every file it links to on the root domain', () => {
      const paths = [...page.querySelectorAll('[href], [src]')]
        .map((element) => element.getAttribute('href') ?? element.getAttribute('src')!)
        .filter((url) => url.startsWith('/') && !url.startsWith('//'));
      const missing = paths.filter(
        (path) => !existsSync(new URL(`../public/home${path}`, import.meta.url)),
      );
      expect(missing).toEqual([]);
    });

    it('shows the same favicon as the Thai site', () => {
      expect(read('../public/home/favicon.svg')).toBe(read('../public/favicon.svg'));
    });

    it('lists the home page and the Thai site for robots', () => {
      expect(read('../public/home/robots.txt')).toContain(
        'Sitemap: https://scriptomancy.com/sitemap.xml',
      );
      const sitemap = read('../public/home/sitemap.xml');
      expect(sitemap).toContain('<loc>https://scriptomancy.com/</loc>');
      expect(sitemap).toContain('<loc>https://thai.scriptomancy.com/</loc>');
    });
  });

  describe('its content', () => {
    it('has one title, the logo, then the tagline', () => {
      const headings = page.querySelectorAll('h1');
      expect(headings).toHaveLength(1);
      expect(headings[0]?.textContent?.trim()).toBe('Scriptomancy');
      expect(page.body.textContent).toContain("Games to read the world's scripts");
    });

    it('shows a tile per language, in order', () => {
      expect(tiles().map((tile) => tile.getAttribute('data-language'))).toEqual(
        LANGUAGES.map((name) => name.toLowerCase()),
      );
      expect(tiles().map((tile) => tile.querySelector('.name')?.textContent?.trim())).toEqual(
        LANGUAGES,
      );
    });

    it('opens Thai only: one link, to the Thai site', () => {
      const links = [...page.querySelectorAll('a')];
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://thai.scriptomancy.com']);
      expect(links[0]?.closest('[data-language]')?.getAttribute('data-language')).toBe('thai');
    });

    // Not links, not focusable: Tab goes from Thai to the rest of the page.
    it('announces the other languages, without anything to click or focus', () => {
      for (const tile of tiles().slice(1)) {
        expect(tile.querySelector('a, [tabindex], button')).toBeNull();
        expect(tile.textContent).toContain('Coming soon');
      }
      expect(tiles()[0]?.textContent).not.toContain('Coming soon');
    });

    // An image that fails to load still keeps its place, and says what it shows.
    it('gives every picture a description and a size; only Thai loads at once', () => {
      const images = tiles().map((tile) => tile.querySelector('img')!);
      for (const image of images) {
        expect(image.getAttribute('alt')?.trim().length).toBeGreaterThan(20);
        expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
        expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
      }
      expect(images.map((image) => image.getAttribute('loading'))).toEqual([
        null,
        'lazy',
        'lazy',
        'lazy',
        'lazy',
      ]);
    });

    it('ends with the copyright', () => {
      expect(page.querySelector('footer')?.textContent?.trim()).toBe('© 2026 Scriptomancy');
    });
  });

  describe('its colours', () => {
    const COLORS = opaqueColors(read('./home.scss'));
    const TEXTS = ['home-text', 'home-muted', ...LANGUAGES.map((l) => `lang-${l.toLowerCase()}`)];

    it('define every colour the checks read', () => {
      const missing = [...TEXTS, 'home-background', 'home-glow'].filter((n) => !COLORS.has(n));
      expect(missing).toEqual([]);
    });

    it('keep green for Thai: the page itself is grey', () => {
      const [r, g, b] = [1, 3, 5].map((i) =>
        parseInt(COLORS.get('home-glow')!.slice(i, i + 2), 16),
      );
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThan(12);
    });

    it.each(
      TEXTS.flatMap((text) => [
        [text, 'home-background'],
        [text, 'home-glow'],
      ]),
    )('%s reads on %s at WCAG AA (4.5:1)', (text, background) => {
      expect(contrast(COLORS.get(text)!, COLORS.get(background)!)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
