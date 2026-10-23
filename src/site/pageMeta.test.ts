/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { pageMeta, SITE_URL } from './pageMeta';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('pageMeta', () => {
  it('names the home page after the site and what it is for', () => {
    expect(pageMeta('/')).toEqual({
      title: 'Mahasamut — Games to read Thai script',
      description: expect.stringMatching(/\S/) as unknown as string,
      canonical: `${SITE_URL}/`,
    });
  });

  it.each(GAME_IDS)('gives the %s game its own title, description and address', (game) => {
    const meta = pageMeta(GAME_PATHS[game]);
    expect(meta.title).toBe(`${GAME_NAMES[game]} — Mahasamut`);
    expect(meta.canonical).toBe(`${SITE_URL}${GAME_PATHS[game]}`);
    expect(meta.description.length).toBeGreaterThan(50);
    expect(meta.description).not.toBe(pageMeta('/').description);
  });

  // A game opened from a link carries its settings in the address: the page to
  // index is the game's settings page.
  it.each(GAME_IDS)('points the %s game itself at its settings page', (game) => {
    expect(pageMeta(`${GAME_PATHS[game]}/play`)).toEqual({
      ...pageMeta(GAME_PATHS[game]),
      canonical: `${SITE_URL}${GAME_PATHS[game]}`,
    });
  });

  it('gives the about page its own title, description and address', () => {
    const about = pageMeta('/about');
    expect(about.title).toBe('About — Mahasamut');
    expect(about.canonical).toBe(`${SITE_URL}/about`);
    expect(about.description).not.toBe(pageMeta('/').description);
  });

  it('gives the contact page its own title, description and address', () => {
    const contact = pageMeta('/contact');
    expect(contact.title).toBe('Contact — Mahasamut');
    expect(contact.canonical).toBe(`${SITE_URL}/contact`);
    expect(contact.description).not.toBe(pageMeta('/').description);
  });

  it('gives the privacy page its own title, description and address', () => {
    const privacy = pageMeta('/privacy');
    expect(privacy.title).toBe('Privacy and legal notice — Mahasamut');
    expect(privacy.canonical).toBe(`${SITE_URL}/privacy`);
    expect(privacy.description.length).toBeGreaterThan(50);
    expect(privacy.description).not.toBe(pageMeta('/').description);
  });

  it('keeps an unknown page out of search engines', () => {
    expect(pageMeta('/nowhere')).toEqual({
      title: 'Page not found — Mahasamut',
      description: pageMeta('/').description,
      canonical: null,
    });
  });

  it('reads a trailing slash as the same page', () => {
    expect(pageMeta('/syllable/')).toEqual(pageMeta('/syllable'));
  });
});

describe('index.html', () => {
  const page = new JSDOM(read('../../index.html')).window.document;
  const meta = (selector: string) => page.querySelector(selector)?.getAttribute('content');
  const home = pageMeta('/');

  // Crawlers that do not run the script see the home page's tags as they are.
  it("carries the home page's title, description and address", () => {
    expect(page.documentElement.getAttribute('lang')).toBe('en');
    expect(page.title).toBe(home.title);
    expect(meta('meta[name="description"]')).toBe(home.description);
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(home.canonical);
  });

  it('can be shared, with a title, a description and an address', () => {
    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[property="og:site_name"]')).toBe('Mahasamut');
    expect(meta('meta[property="og:title"]')).toBe(home.title);
    expect(meta('meta[property="og:description"]')).toBe(home.description);
    expect(meta('meta[property="og:url"]')).toBe(home.canonical);
    expect(meta('meta[name="twitter:card"]')).toBe('summary');
  });

  it('describes the site as a WebSite', () => {
    const script = page.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? '')).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Mahasamut',
      url: `${SITE_URL}/`,
      inLanguage: 'en',
    });
  });
});

describe('robots.txt and sitemap.xml', () => {
  it('lets robots in and points them at the sitemap', () => {
    const robots = read('../../public/robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('lists the home page, every game, the about, contact and privacy pages, and nothing else', () => {
    const locs = [...read('../../public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      ([, loc]) => loc,
    );
    expect(locs).toEqual([
      `${SITE_URL}/`,
      ...GAME_IDS.map((game) => `${SITE_URL}${GAME_PATHS[game]}`),
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/privacy`,
    ]);
  });
});
