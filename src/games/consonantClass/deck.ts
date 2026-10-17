/**
 * The deck of the consonant class game.
 *
 * The 42 consonants are shuffled and shown one by one, so that every one comes
 * up once before any comes up again. After the last card, a new deck is
 * shuffled; it never starts with the card just shown, so the player never sees
 * the same consonant twice in a row.
 *
 * Frequency choice: each consonant comes up as often as the others, so the
 * low class (23 of the 42) is the answer a bit more than half the time.
 */
import { CONSONANTS } from '../../thai/consonants';
import type { Consonant } from '../../thai/consonants';
import type { Rng } from '../../thai/generator';

/** A shuffled deck of consonants, and the card shown. */
export interface Deck {
  readonly cards: readonly Consonant[];
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
 * A new deck of the 42 consonants, shuffled, showing its first card.
 *
 * @param avoidFirst a card the deck must not start with: the one just shown.
 *   If the shuffle puts it first, it is swapped with another card at random.
 */
export function newDeck(rng: Rng, avoidFirst?: Consonant): Deck {
  const cards = shuffle(CONSONANTS, rng);
  if (cards[0] === avoidFirst) swap(cards, 0, 1 + Math.floor(rng() * (cards.length - 1)));
  return { cards, position: 0 };
}

/** The card the deck shows. */
export function currentCard(deck: Deck): Consonant {
  const card = deck.cards[deck.position];
  if (card === undefined) throw new Error(`No card at position ${deck.position}`);
  return card;
}

/** The deck showing its next card, or a new deck after the last one. */
export function nextCard(deck: Deck, rng: Rng): Deck {
  if (deck.position + 1 < deck.cards.length) return { ...deck, position: deck.position + 1 };
  return newDeck(rng, currentCard(deck));
}

function swap<T>(items: T[], i: number, j: number) {
  [items[i], items[j]] = [items[j] as T, items[i] as T];
}
