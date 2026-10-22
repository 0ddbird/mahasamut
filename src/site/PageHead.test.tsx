import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { PageHead } from './PageHead';
import { pageMeta } from './pageMeta';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PageHead />
    </MemoryRouter>,
  );

const head = (selector: string, attribute: string) =>
  document.head.querySelector(selector)?.getAttribute(attribute) ?? null;

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('PageHead', () => {
  it("writes the page's title, description and address into the head", () => {
    renderAt('/syllable');
    const meta = pageMeta('/syllable');
    expect(document.title).toBe(meta.title);
    expect(head('meta[name="description"]', 'content')).toBe(meta.description);
    expect(head('link[rel="canonical"]', 'href')).toBe(meta.canonical);
    expect(head('meta[property="og:title"]', 'content')).toBe(meta.title);
    expect(head('meta[property="og:description"]', 'content')).toBe(meta.description);
    expect(head('meta[property="og:url"]', 'content')).toBe(meta.canonical);
    expect(head('meta[name="robots"]', 'content')).toBeNull();
  });

  it('updates the tags already in the page rather than adding more', () => {
    document.head.innerHTML =
      '<meta name="description" content="old"><link rel="canonical" href="old">';
    renderAt('/vowel');
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head('link[rel="canonical"]', 'href')).toBe(pageMeta('/vowel').canonical);
  });

  it('keeps an unknown page out of search engines, with no address', () => {
    renderAt('/nowhere');
    expect(head('meta[name="robots"]', 'content')).toBe('noindex');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(head('meta[property="og:url"]', 'content')).toBeNull();
  });
});
