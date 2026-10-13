import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Consonant } from '../../thai/consonants';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import type { ConsonantClass } from '../../thai/types';
import { ClassesPage } from './ClassesPage';
import { currentCard, newDeck, nextCard } from './deck';

const SEED = 7;

/** The first `count` consonants the page shows with `seed`. */
const cardsShown = (seed: number, count: number): Consonant[] => {
  const rng = seededRng(seed);
  let deck = newDeck(rng);
  const shown = [currentCard(deck)];
  while (shown.length < count) {
    deck = nextCard(deck, rng);
    shown.push(currentCard(deck));
  }
  return shown;
};

const FIRST = cardsShown(SEED, 1)[0] as Consonant;
const WRONG_CLASS: ConsonantClass = FIRST.consonantClass === 'mid' ? 'low' : 'mid';

/** The accessible name of a class choice: 'mid' is 'Mid'. */
const className = (value: ConsonantClass) => value.charAt(0).toUpperCase() + value.slice(1);

const row = () => within(screen.getByRole('group', { name: 'Consonant class' }));
const choose = (value: ConsonantClass) =>
  userEvent.click(row().getByRole('radio', { name: className(value) }));
const validateButton = () => screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
const nextButton = () => screen.getByRole('button', { name: 'Next' });
const choices = () => row().getAllByRole('radio');
// A choice is locked by its row's fieldset: its own `disabled` property stays false.
const locked = (choice: HTMLElement) => choice.matches(':disabled');
const checked = (choice: HTMLElement) => (choice as HTMLInputElement).checked;

describe('ClassesPage', () => {
  it('is titled Akson sam mu', () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    expect(screen.getByRole('heading', { level: 1, name: /Akson sam mu/ })).toBeDefined();
  });

  it('shows the first consonant of a shuffled deck', () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    expect(screen.getByText(FIRST.char).getAttribute('lang')).toBe('th');
  });

  it('shows the next consonant of the deck when Next is clicked', async () => {
    const [, second] = cardsShown(SEED, 2);
    render(<ClassesPage rng={seededRng(SEED)} />);

    await userEvent.click(nextButton());
    expect(screen.getByText(second?.char ?? '').getAttribute('lang')).toBe('th');
  });

  it('can only validate once a class is chosen', async () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    expect(validateButton().disabled).toBe(true);

    await choose(FIRST.consonantClass);
    expect(validateButton().disabled).toBe(false);
  });

  it('says Correct! for the right class, then locks the answer', async () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    await choose(FIRST.consonantClass);
    await userEvent.click(validateButton());

    expect(screen.getByRole('status').textContent).toBe('Correct!');
    expect(
      row().getByRole('radio', { name: `${className(FIRST.consonantClass)} (right)` }),
    ).toBeDefined();
    expect(choices().every(locked)).toBe(true);
    expect(validateButton().disabled).toBe(true);
  });

  it('says Not quite for a wrong class, and marks the right one', async () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    await userEvent.click(validateButton());

    expect(screen.getByRole('status').textContent).toBe('Not quite');
    expect(row().getByRole('radio', { name: `${className(WRONG_CLASS)} (wrong)` })).toBeDefined();
    expect(
      row().getByRole('radio', {
        name: `${className(FIRST.consonantClass)} (the right answer)`,
      }),
    ).toBeDefined();
  });

  it('starts again on Next: no verdict, no choice, answer unlocked', async () => {
    render(<ClassesPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    await userEvent.click(validateButton());
    await userEvent.click(nextButton());

    expect(screen.queryByRole('status')).toBeNull();
    expect(choices().some(checked)).toBe(false);
    expect(choices().some(locked)).toBe(false);
  });
});
