import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { VOWELS } from '../../thai/vowels';
import type { Vowel } from '../../thai/vowels';
import { VOWEL_IPA, vowelOnCarrier } from '../../thai/vowels/ipa';
import { currentCard, newDeck, nextCard } from '../shared/deck';
import { GAME, GAME_NAMES } from '../shared/games';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { CORRECT_DELAY_MS } from '../shared/useNextWhenCorrect';
import { vowelChoices } from './choices';
import { VowelPage } from './VowelPage';

const SEED = 7;

/** The first `count` questions the page shows with `seed`: each vowel and its answers. */
const questionsShown = (seed: number, count: number) => {
  const rng = seededRng(seed);
  let deck = newDeck(VOWELS, rng);
  const shown = [{ vowel: currentCard(deck), choices: vowelChoices(currentCard(deck), rng) }];
  while (shown.length < count) {
    deck = nextCard(deck, rng);
    shown.push({ vowel: currentCard(deck), choices: vowelChoices(currentCard(deck), rng) });
  }
  return shown;
};

const [FIRST, SECOND] = questionsShown(SEED, 2) as [
  { vowel: Vowel; choices: string[] },
  { vowel: Vowel; choices: string[] },
];
const RIGHT = VOWEL_IPA[FIRST.vowel.id];
const WRONG = FIRST.choices.find((choice) => choice !== RIGHT)!;

/** The Thai text read aloud for a sound: the first vowel that has it, on อ. */
const textOf = (sound: string) => vowelOnCarrier(VOWELS.find((v) => VOWEL_IPA[v.id] === sound)!);

const renderPage = (settings: GameSettings = DEFAULT_SETTINGS) => {
  const speak = vi.fn();
  render(<VowelPage rng={seededRng(SEED)} settings={settings} speak={speak} />);
  return speak;
};

const row = () => within(screen.getByRole('group', { name: 'Sound' }));
const choose = (sound: string) => userEvent.click(row().getByRole('radio', { name: `/${sound}/` }));
const validateButton = () => screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;

afterEach(() => {
  vi.useRealTimers();
});

describe('VowelPage', () => {
  it('is titled with the name of the game', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: GAME_NAMES[GAME.Vowel] })).toBeDefined();
  });

  it('shows a vowel written on อ, and four answers in IPA', () => {
    renderPage();
    expect(screen.getByText(vowelOnCarrier(FIRST.vowel)).getAttribute('lang')).toBe('th');
    expect(
      row()
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(FIRST.choices);
    expect(row().getByRole('radio', { name: `/${RIGHT}/` })).toBeDefined();
  });

  it('plays the sound of an answer when it is chosen', async () => {
    const speak = renderPage();
    await choose(WRONG);
    expect(speak).toHaveBeenLastCalledWith(textOf(WRONG));
    await choose(RIGHT);
    expect(speak).toHaveBeenLastCalledWith(textOf(RIGHT));
  });

  it('can only validate once a sound is chosen', async () => {
    renderPage();
    expect(validateButton().disabled).toBe(true);
    await choose(RIGHT);
    expect(validateButton().disabled).toBe(false);
  });

  it('moves on by itself after the right sound', async () => {
    renderPage();
    await choose(RIGHT);
    vi.useFakeTimers();
    fireEvent.click(validateButton());
    expect(screen.getByRole('status').textContent).toBe('Correct!');
    expect(row().getByRole('radio', { name: `/${RIGHT}/ (right)` })).toBeDefined();

    act(() => vi.advanceTimersByTime(CORRECT_DELAY_MS));
    expect(screen.getByText(vowelOnCarrier(SECOND.vowel))).toBeDefined();
  });

  it('shows the right sound after a wrong one, then Next', async () => {
    renderPage();
    await choose(WRONG);
    await userEvent.click(validateButton());

    expect(row().getByRole('radio', { name: `/${WRONG}/ (wrong)` })).toBeDefined();
    expect(row().getByRole('radio', { name: `/${RIGHT}/ (the right answer)` })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(vowelOnCarrier(SECOND.vowel))).toBeDefined();
  });

  it('replays the right answer once checked, and only then', async () => {
    const speak = renderPage();
    expect(screen.queryByRole('button', { name: 'Listen' })).toBeNull();

    await choose(WRONG);
    await userEvent.click(validateButton());
    await userEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(speak).toHaveBeenLastCalledWith(vowelOnCarrier(FIRST.vowel));
  });

  it('plays a series to its results', async () => {
    renderPage({ ...DEFAULT_SETTINGS, questionCount: 5 });
    await userEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(screen.getByRole('heading', { name: 'No answers this time.' })).toBeDefined();
  });

  it('offers the vowels panel in learning mode only', () => {
    renderPage({ ...DEFAULT_SETTINGS, learningMode: true });
    expect(screen.getByRole('button', { name: 'Vowels' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Consonants' })).toBeNull();
  });
});
