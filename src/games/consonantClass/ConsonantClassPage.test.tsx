import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Consonant } from '../../thai/consonants';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import type { ConsonantClass } from '../../thai/types';
import { GAME, GAME_NAMES } from '../shared/games';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { CORRECT_DELAY_MS } from '../shared/useNextWhenCorrect';
import { ConsonantClassPage } from './ConsonantClassPage';
import { renderInSite } from '../../site/inSite.test-utils';
import { CONSONANTS } from '../../thai/consonants';
import { currentCard, newDeck, nextCard } from '../shared/deck';

/** Renders under the site's bar: End is there, and the results link to the settings page and home. */
const render = (ui: ReactElement) => renderInSite(ui);

const SEED = 7;

/** The first `count` consonants the page shows with `seed`. */
const cardsShown = (seed: number, count: number): Consonant[] => {
  const rng = seededRng(seed);
  let deck = newDeck(CONSONANTS, rng);
  const shown = [currentCard(deck)];
  while (shown.length < count) {
    deck = nextCard(deck, rng);
    shown.push(currentCard(deck));
  }
  return shown;
};

const [FIRST, SECOND] = cardsShown(SEED, 2) as [Consonant, Consonant];
const WRONG_CLASS: ConsonantClass = FIRST.consonantClass === 'mid' ? 'low' : 'mid';

/** The accessible name of a class choice: 'mid' is 'Mid'. */
const className = (value: ConsonantClass) => value.charAt(0).toUpperCase() + value.slice(1);

const row = () => within(screen.getByRole('group', { name: 'Consonant class' }));
const choose = (value: ConsonantClass) =>
  userEvent.click(row().getByRole('radio', { name: className(value) }));
const validateButton = () => screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
const nextButton = () => screen.getByRole('button', { name: 'Next' });
const shown = (consonant: Consonant) => screen.queryByText(consonant.char) !== null;
const choices = () => row().getAllByRole('radio');
// A choice is locked by its row's fieldset: its own `disabled` property stays false.
const locked = (choice: HTMLElement) => choice.matches(':disabled');
const checked = (choice: HTMLElement) => (choice as HTMLInputElement).checked;

/**
 * Clicks Validate, then lets time pass only through `wait`. userEvent hangs
 * on Vitest's fake timers, so this click goes through fireEvent.
 */
const validateThenStopTime = () => {
  vi.useFakeTimers();
  fireEvent.click(validateButton());
};
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

afterEach(() => {
  vi.useRealTimers();
});

describe('ConsonantClassPage', () => {
  it('is titled with the name of the game', () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(GAME_NAMES[GAME.ConsonantClass]) }),
    ).toBeDefined();
  });

  it('shows the first consonant of a shuffled deck', () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    expect(screen.getByText(FIRST.char).getAttribute('lang')).toBe('th');
  });

  it('offers Validate, and no Next, before the answer is checked', () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toEqual(['End', 'Validate', 'Report a problem with this question']);
  });

  it('can only validate once a class is chosen', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    expect(validateButton().disabled).toBe(true);

    await choose(FIRST.consonantClass);
    expect(validateButton().disabled).toBe(false);
  });

  it('says Correct! for the right class, then locks the answer', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(FIRST.consonantClass);
    await userEvent.click(validateButton());

    expect(screen.getByRole('status').textContent).toBe('Correct!');
    expect(
      row().getByRole('radio', { name: `${className(FIRST.consonantClass)} (right)` }),
    ).toBeDefined();
    expect(choices().every(locked)).toBe(true);
    expect(validateButton().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('shows the next consonant by itself, a moment after the right class', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(FIRST.consonantClass);
    validateThenStopTime();

    wait(CORRECT_DELAY_MS - 1);
    expect(shown(FIRST)).toBe(true);

    wait(1);
    expect(shown(SECOND)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
    expect(choices().some(checked)).toBe(false);
    expect(choices().some(locked)).toBe(false);
  });

  it('says Not quite for a wrong class, and marks the right one', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
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

  it('turns Validate into Next for a wrong class, keeping the focus on it', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    await userEvent.click(validateButton());

    expect(screen.queryByRole('button', { name: 'Validate' })).toBeNull();
    expect(document.activeElement).toBe(nextButton());
  });

  it('waits for Next after a wrong class, however long the player reads', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    validateThenStopTime();

    wait(60_000);
    expect(shown(FIRST)).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Not quite');
  });

  it('starts again on Next: next consonant, no verdict, no choice, answer unlocked', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    await userEvent.click(validateButton());
    await userEvent.click(nextButton());

    expect(shown(SECOND)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
    expect(choices().some(checked)).toBe(false);
    expect(choices().some(locked)).toBe(false);
  });

  it('keeps the score for the results', async () => {
    render(<ConsonantClassPage rng={seededRng(SEED)} />);
    await choose(WRONG_CLASS);
    await userEvent.click(validateButton());
    expect(screen.queryByText(/Score/)).toBeNull();
  });

  describe('with settings', () => {
    const withSettings = (settings: Partial<GameSettings>) => ({
      ...DEFAULT_SETTINGS,
      ...settings,
    });
    /** Lets the time of the question run out; the timer starts when the page shows. */
    const letTimeRunOut = () => wait(10_000);

    it('shows the time left, and the correction once time is up', () => {
      vi.useFakeTimers();
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={withSettings({ secondsPerQuestion: 10 })}
        />,
      );
      expect(screen.getByRole('timer', { name: '10 seconds' }).textContent).toBe('10');

      letTimeRunOut();
      expect(screen.getByRole('status').textContent).toBe("Time's up!");
      expect(choices().every(locked)).toBe(true);
      expect(
        row().getByRole('radio', {
          name: `${className(FIRST.consonantClass)} (the right answer)`,
        }),
      ).toBeDefined();
      expect(nextButton()).toBeDefined();
    });

    it('takes a series from the deck, up to its results', () => {
      const series = cardsShown(SEED, 5);
      vi.useFakeTimers();
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={withSettings({ questionCount: 5, secondsPerQuestion: 10 })}
        />,
      );
      series.forEach((consonant, index) => {
        expect(screen.getByText(`${index + 1} / 5`)).toBeDefined();
        expect(shown(consonant)).toBe(true);
        letTimeRunOut();
        const isLast = index === series.length - 1;
        fireEvent.click(screen.getByRole('button', { name: isLast ? 'See results' : 'Next' }));
      });

      expect(screen.getByRole('heading', { name: 'Keep practising!' })).toBeDefined();
      expect(screen.getByText('You got 0 out of 5 right (0%).')).toBeDefined();
    });

    it('lists the question on the results, with the right class', async () => {
      render(
        <ConsonantClassPage rng={seededRng(SEED)} settings={withSettings({ questionCount: 1 })} />,
      );
      await choose(WRONG_CLASS);
      await userEvent.click(validateButton());
      await userEvent.click(screen.getByRole('button', { name: 'See results' }));

      const line = within(screen.getByRole('region', { name: 'Your answers' })).getByRole(
        'listitem',
      );
      expect(line.textContent).toContain(FIRST.char);
      expect(line.textContent).toContain(`Right answer: ${className(FIRST.consonantClass)}`);
    });

    it('lists each question with its own answer, the second one included', async () => {
      const wrongClassOf = (consonant: Consonant): ConsonantClass =>
        consonant.consonantClass === 'mid' ? 'low' : 'mid';
      render(
        <ConsonantClassPage rng={seededRng(SEED)} settings={withSettings({ questionCount: 2 })} />,
      );
      await choose(wrongClassOf(FIRST));
      await userEvent.click(validateButton());
      await userEvent.click(nextButton());
      await choose(wrongClassOf(SECOND));
      await userEvent.click(validateButton());
      await userEvent.click(screen.getByRole('button', { name: 'See results' }));

      const lines = within(screen.getByRole('region', { name: 'Your answers' })).getAllByRole(
        'listitem',
      );
      [FIRST, SECOND].forEach((consonant, index) => {
        const text = lines[index]?.textContent;
        expect(text).toContain(consonant.char);
        expect(text).toContain(`Your answer: ${className(wrongClassOf(consonant))}`);
        expect(text).toContain(`Right answer: ${className(consonant.consonantClass)}`);
      });
    });

    it('lists the question shown when the time ran out, without an answer', () => {
      vi.useFakeTimers();
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={withSettings({ questionCount: 1, secondsPerQuestion: 10 })}
        />,
      );
      letTimeRunOut();
      fireEvent.click(screen.getByRole('button', { name: 'See results' }));

      const line = within(screen.getByRole('region', { name: 'Your answers' })).getByRole(
        'listitem',
      );
      expect(line.textContent).toContain(FIRST.char);
      expect(line.textContent).toContain("Time's up");
      expect(line.textContent).not.toContain('Your answer');
    });

    it('ends the game with End', async () => {
      render(<ConsonantClassPage rng={seededRng(SEED)} />);
      await userEvent.click(screen.getByRole('button', { name: 'End' }));

      expect(screen.getByRole('heading', { name: 'No answers this time.' })).toBeDefined();
      expect(screen.getByText('Endless · Untimed')).toBeDefined();
    });

    it('plays again with the same settings', async () => {
      render(
        <ConsonantClassPage rng={seededRng(SEED)} settings={withSettings({ questionCount: 5 })} />,
      );
      await choose(FIRST.consonantClass);
      await userEvent.click(validateButton());
      await userEvent.click(screen.getByRole('button', { name: 'End' }));
      await userEvent.click(screen.getByRole('button', { name: 'Play again' }));

      expect(screen.getByText('1 / 5')).toBeDefined();
      expect(validateButton().disabled).toBe(true);
    });
  });

  describe('in learning mode', () => {
    it('offers the consonant panel only', () => {
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={{ ...DEFAULT_SETTINGS, learningMode: true }}
        />,
      );
      expect(screen.getByRole('button', { name: 'Consonants' })).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Vowels' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Tones' })).toBeNull();
    });

    it('offers no help panel outside learning mode', () => {
      render(<ConsonantClassPage rng={seededRng(SEED)} />);
      expect(screen.queryByRole('button', { name: 'Consonants' })).toBeNull();
    });
  });

  describe('reporting a question', () => {
    const flag = () =>
      screen.queryByRole('button', { name: 'Report a problem with this question' });

    it('offers the flag before and after the answer, and not on the results', async () => {
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={{ ...DEFAULT_SETTINGS, questionCount: 1 }}
        />,
      );
      expect(flag()).not.toBeNull();

      await choose(WRONG_CLASS);
      await userEvent.click(validateButton());
      expect(flag()).not.toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'See results' }));
      expect(flag()).toBeNull();
    });

    it('opens the window on the consonant shown, with the reasons of the game', async () => {
      render(<ConsonantClassPage rng={seededRng(SEED)} />);
      await userEvent.click(flag()!);

      const dialog = within(screen.getByRole('dialog', { name: 'Report a problem' }));
      expect(dialog.getByText(FIRST.char)).toBeDefined();
      expect(dialog.getAllByRole('checkbox').map((box) => box.parentElement?.textContent)).toEqual([
        'The expected class is wrong',
        'Other',
      ]);
    });

    it('stops the clock while the window is open, and starts it again once closed', () => {
      vi.useFakeTimers();
      render(
        <ConsonantClassPage
          rng={seededRng(SEED)}
          settings={{ ...DEFAULT_SETTINGS, secondsPerQuestion: 10 }}
        />,
      );
      fireEvent.click(flag()!);
      wait(60_000);
      expect(screen.queryByRole('status')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      wait(10_000);
      expect(screen.getByRole('status').textContent).toBe("Time's up!");
    });
  });
});
