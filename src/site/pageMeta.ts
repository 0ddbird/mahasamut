/**
 * What search engines and link previews read about each page: its title, its
 * description and its one address. index.html carries the home page's; PageHead
 * swaps them as the player moves around the site.
 */
import { GAME, GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import type { GameId } from '../games/shared/games';

/** Where the site is served. */
export const SITE_URL = 'https://mahasamut.app';

export interface PageMeta {
  title: string;
  description: string;
  /** The page's address for search engines; `null` keeps it out of them. */
  canonical: string | null;
}

const HOME: PageMeta = {
  title: 'Mahasamut — Games to read Thai script',
  description:
    'Short games to learn to read Thai script: the class of a consonant, the sound of a vowel, the tone of a word. Free, with no account.',
  canonical: `${SITE_URL}/`,
};

const ABOUT: PageMeta = {
  title: 'About — Mahasamut',
  description:
    'Where the name Mahasamut comes from, who makes these games to read Thai script, and the open sources they are built on.',
  canonical: `${SITE_URL}/about`,
};

/** What each game is about, in a sentence or two. */
const GAME_DESCRIPTIONS: Record<GameId, string> = {
  [GAME.ConsonantClass]:
    'Read a Thai consonant and find its class, mid, high or low: the first step towards the tone of a syllable.',
  [GAME.Vowel]:
    'Read a Thai vowel and find how it sounds, among answers written in the International Phonetic Alphabet and played aloud.',
  [GAME.Syllable]:
    'Read a Thai word of one syllable and find its tone, step by step: consonant class, tone mark, vowel length, final, live or dead.',
};

const gameMeta = (game: GameId): PageMeta => ({
  title: `${GAME_NAMES[game]} — Mahasamut`,
  description: GAME_DESCRIPTIONS[game],
  canonical: `${SITE_URL}${GAME_PATHS[game]}`,
});

/**
 * The tags of the page at `pathname`. A game itself (`/syllable/play`) points at
 * its settings page, since its address carries the settings; an unknown path is
 * kept out of search engines, the server answering it like any other.
 */
export function pageMeta(pathname: string): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return HOME;
  if (path === '/about') return ABOUT;
  const game = GAME_IDS.find((id) => path === GAME_PATHS[id] || path === `${GAME_PATHS[id]}/play`);
  if (game !== undefined) return gameMeta(game);
  return { title: 'Page not found — Mahasamut', description: HOME.description, canonical: null };
}
