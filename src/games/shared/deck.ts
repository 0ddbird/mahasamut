/**
 * A shuffled deck, for the games that show their items one by one.
 *
 * The items are shuffled and shown in turn, so that every one comes up once
 * before any comes up again. After the last card, a new deck is shuffled; it
 * never starts with the card just shown, so the player never sees the same
 * item twice in a row.
 */
import type { Rng } from '../../thai/generator';

/** A shuffled deck of items, and the card shown. */
export interface Deck<T> {
  readonly cards: readonly T[];
  /** The index of the card shown in `cards`. */
  readonly position: number;
}

/**
 * A shuffled copy of `items` (Fisher–Yates): every order is equally likely.
 *
 * @param rng source of random numbers in [0, 1), such as `Math.random`.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    swap(shuffled, i, j);
  }
  return shuffled;
}

/**
 * A new deck of `items`, shuffled, showing its first card.
 *
 * @param avoidFirst a card the deck must not start with: the one just shown.
 *   If the shuffle puts it first, it is swapped with another card at random.
 */
export function newDeck<T>(items: readonly T[], rng: Rng, avoidFirst?: T): Deck<T> {
  const cards = shuffle(items, rng);
  // A single card has no other to swap with: it comes up again.
  if (cards.length > 1 && cards[0] === avoidFirst) {
    swap(cards, 0, 1 + Math.floor(rng() * (cards.length - 1)));
  }
  return { cards, position: 0 };
}

/** The card the deck shows. */
export function currentCard<T>(deck: Deck<T>): T {
  const card = deck.cards[deck.position];
  if (card === undefined) throw new Error(`No card at position ${deck.position}`);
  return card;
}

/** The deck showing its next card, or a new deck of the same cards after the last one. */
export function nextCard<T>(deck: Deck<T>, rng: Rng): Deck<T> {
  if (deck.position + 1 < deck.cards.length) return { ...deck, position: deck.position + 1 };
  return newDeck(deck.cards, rng, currentCard(deck));
}

function swap<T>(items: T[], i: number, j: number) {
  [items[i], items[j]] = [items[j] as T, items[i] as T];
}
