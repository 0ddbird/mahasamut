import { describe, expect, it } from 'vitest';
import { CONSONANTS } from '../../thai/consonants';
import type { Consonant } from '../../thai/consonants';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { currentCard, newDeck, nextCard, shuffle } from './deck';
import type { Deck } from './deck';

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

const chars = (cards: readonly Consonant[]) => cards.map((c) => c.char);
const sorted = (cards: readonly Consonant[]) => chars(cards).sort();

/** The deck after `count` calls to `nextCard`. */
const drawn = (deck: Deck<Consonant>, count: number, rng: () => number) => {
  for (let i = 0; i < count; i++) deck = nextCard(deck, rng);
  return deck;
};

describe('shuffle', () => {
  it('keeps every item once', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const seed of SEEDS) {
      expect(shuffle(items, seededRng(seed)).sort()).toEqual(items);
    }
  });

  it('leaves the given list untouched', () => {
    const items = [1, 2, 3, 4, 5];
    shuffle(items, seededRng(1));
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('gives the same order for the same seed, and other orders for other seeds', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(items, seededRng(3))).toEqual(shuffle(items, seededRng(3)));

    const orders = new Set(SEEDS.map((seed) => shuffle(items, seededRng(seed)).join()));
    expect(orders.size).toBeGreaterThan(40);
  });

  it('can put any item first', () => {
    const items = [1, 2, 3, 4];
    const firsts = new Set(SEEDS.map((seed) => shuffle(items, seededRng(seed))[0]));
    expect([...firsts].sort()).toEqual(items);
  });
});

describe('newDeck', () => {
  it('deals a single item over and over, having no other to show', () => {
    let deck = newDeck(['only'], seededRng(1));
    for (let i = 0; i < 3; i++) {
      expect(currentCard(deck)).toBe('only');
      deck = nextCard(deck, seededRng(i));
    }
  });

  it('deals any list of items', () => {
    const deck = newDeck([1, 2, 3], seededRng(1));
    expect([...deck.cards].sort()).toEqual([1, 2, 3]);
    expect(deck.cards).toContain(currentCard(deck));
  });

  it('holds the 42 consonants once each, and starts at the first card', () => {
    const deck = newDeck(CONSONANTS, seededRng(1));
    expect(deck.cards).toHaveLength(42);
    expect(sorted(deck.cards)).toEqual(sorted(CONSONANTS));
    expect(currentCard(deck)).toBe(deck.cards[0]);
  });

  it('never starts with the card to avoid, even when the shuffle put it first', () => {
    for (const seed of SEEDS) {
      // With the same seed, the shuffle puts this card first again.
      const avoided = currentCard(newDeck(CONSONANTS, seededRng(seed)));
      const deck = newDeck(CONSONANTS, seededRng(seed), avoided);

      expect(currentCard(deck)).not.toBe(avoided);
      expect(sorted(deck.cards)).toEqual(sorted(CONSONANTS));
    }
  });
});

describe('nextCard', () => {
  it('moves to the next card of the same deck', () => {
    const deck = newDeck(CONSONANTS, seededRng(1));
    const next = nextCard(deck, seededRng(2));
    expect(next.cards).toBe(deck.cards);
    expect(currentCard(next)).toBe(deck.cards[1]);
  });

  it('shows every consonant once before showing one again', () => {
    const rng = seededRng(4);
    let deck = newDeck(CONSONANTS, rng);
    const shown: Consonant[] = [];
    for (let i = 0; i < 42 * 3; i++) {
      shown.push(currentCard(deck));
      deck = nextCard(deck, rng);
    }
    for (let start = 0; start < shown.length; start += 42) {
      expect(sorted(shown.slice(start, start + 42))).toEqual(sorted(CONSONANTS));
    }
  });

  it('shuffles a new deck after the last card, never starting with that card', () => {
    for (const seed of SEEDS) {
      const rng = seededRng(seed);
      const last = drawn(newDeck(CONSONANTS, rng), 41, rng);
      const next = nextCard(last, rng);

      expect(next.cards).not.toBe(last.cards);
      expect(currentCard(next)).not.toBe(currentCard(last));
    }
  });
});
