import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSyllable } from '../../thai/generator';
import type { Syllable } from '../../thai/generator';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { CORRECT_DELAY_MS } from '../shared/useNextWhenCorrect';
import type { GameAnswers, Step } from './check';
import { TonesPage } from './TonesPage';

/** The texts of the first `count` syllables drawn with `seed`. */
const textsDrawn = (seed: number, count: number) => {
  const rng = seededRng(seed);
  return Array.from({ length: count }, () => generateSyllable(rng).text);
};

/** The first syllable the page draws with `seed`. */
const firstSyllable = (seed: number) => generateSyllable(seededRng(seed));

/** The smallest seed whose first syllable passes `test`. */
const seedWhere = (test: (syllable: Syllable) => boolean) => {
  for (let seed = 1; seed < 1000; seed++) if (test(firstSyllable(seed))) return seed;
  throw new Error('No seed found');
};

const MARKED_SEED = seedWhere((s) => s.parts.mark !== 'none');
const UNMARKED_SEED = seedWhere((s) => s.parts.mark === 'none');

const ROW_TITLES: Record<Step, string> = {
  consonantClass: 'Consonant class',
  toneMark: 'Tone mark',
  vowelLength: 'Vowel length',
  finalKind: 'Final',
  liveness: 'Syllable',
  tone: 'Tone',
};

const MARK_NAMES: Record<GameAnswers['toneMark'], string> = {
  none: 'None',
  eek: 'Mai eek',
  thoo: 'Mai tho',
  trii: 'Mai trii',
  djattawaa: 'Mai djattawaa',
};

/** The accessible name of a choice: 'falling' is 'Falling', 'eek' is 'Mai eek'. */
const choiceName = (step: Step, value: string) =>
  step === 'toneMark'
    ? MARK_NAMES[value as GameAnswers['toneMark']]
    : value.charAt(0).toUpperCase() + value.slice(1);

const rowOf = (step: Step) => within(screen.getByRole('group', { name: ROW_TITLES[step] }));

/** Clicks, in each row, the choice of `answers`. */
const answerWith = async (answers: Partial<GameAnswers>) => {
  for (const [step, value] of Object.entries(answers) as [Step, string][]) {
    await userEvent.click(rowOf(step).getByRole('radio', { name: choiceName(step, value) }));
  }
};

/**
 * Clicks Validate, then lets time pass only through `wait`. userEvent hangs
 * on Vitest's fake timers, so this click goes through fireEvent.
 */
const validateThenStopTime = () => {
  vi.useFakeTimers();
  fireEvent.click(validateButton());
};
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** All six answers of the first syllable of `seed`, its tone mark included. */
const allAnswersOf = (seed: number): GameAnswers => {
  const { answers, parts } = firstSyllable(seed);
  return { ...answers, toneMark: parts.mark };
};

const validateButton = () => screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
const nextButton = () => screen.getByRole('button', { name: 'Next' });
const shown = (text: string | undefined) => screen.queryByText(text ?? '') !== null;
const choices = () => screen.getAllByRole('radio');
// A choice is locked by its row's fieldset: its own `disabled` property stays false.
const locked = (choice: HTMLElement) => choice.matches(':disabled');
const checked = (choice: HTMLElement) => (choice as HTMLInputElement).checked;

afterEach(() => {
  vi.useRealTimers();
});

describe('TonesPage', () => {
  it('shows a syllable drawn by the generator', () => {
    const [first] = textsDrawn(7, 1);
    render(<TonesPage rng={seededRng(7)} />);
    expect(screen.getByText(first ?? '').getAttribute('lang')).toBe('th');
  });

  it('starts with no tone mark chosen, and nothing else', () => {
    render(<TonesPage rng={seededRng(7)} />);
    const chosen = choices().filter(checked);
    expect(chosen).toEqual([rowOf('toneMark').getByRole('radio', { name: 'None' })]);
  });

  it('keeps the answers chosen', async () => {
    render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
    const longChoice = () => rowOf('vowelLength').getByRole('radio', { name: 'Long' });

    await userEvent.click(longChoice());
    expect(checked(longChoice())).toBe(true);
  });

  it('offers Validate only, and no Next, before the answers are checked', () => {
    render(<TonesPage rng={seededRng(7)} />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Validate']);
  });

  describe('validating a syllable with no tone mark', () => {
    const RIGHT = allAnswersOf(UNMARKED_SEED);
    const WRONG: GameAnswers = { ...RIGHT, tone: RIGHT.tone === 'mid' ? 'low' : 'mid' };
    const [FIRST_TEXT, SECOND_TEXT] = textsDrawn(UNMARKED_SEED, 2);

    it('can only validate once all six rows have an answer', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      expect(validateButton().disabled).toBe(true);

      const { tone, ...allButTone } = RIGHT;
      await answerWith(allButTone);
      expect(validateButton().disabled).toBe(true);

      await answerWith({ tone });
      expect(validateButton().disabled).toBe(false);
    });

    it('says Correct! for the right answers, then locks them', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(RIGHT);
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Correct!');
      expect(choices().every(locked)).toBe(true);
      expect(validateButton().disabled).toBe(true);
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    });

    it('draws the next syllable by itself, a moment after the right answers', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(RIGHT);
      validateThenStopTime();

      wait(CORRECT_DELAY_MS - 1);
      expect(shown(FIRST_TEXT)).toBe(true);

      wait(1);
      expect(shown(SECOND_TEXT)).toBe(true);
      expect(screen.queryByRole('status')).toBeNull();
      expect(choices().filter(checked)).toEqual([
        rowOf('toneMark').getByRole('radio', { name: 'None' }),
      ]);
      expect(choices().some(locked)).toBe(false);
      expect(validateButton().disabled).toBe(true);
    });

    it('says Not quite when a step is wrong, and marks each row', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(WRONG);
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Not quite');
      const toneRow = rowOf('tone');
      expect(
        toneRow.getByRole('radio', { name: `${choiceName('tone', WRONG.tone)} (wrong)` }),
      ).toBeDefined();
      expect(
        toneRow.getByRole('radio', {
          name: `${choiceName('tone', RIGHT.tone)} (the right answer)`,
        }),
      ).toBeDefined();
      expect(
        rowOf('vowelLength').getByRole('radio', {
          name: `${choiceName('vowelLength', RIGHT.vowelLength)} (right)`,
        }),
      ).toBeDefined();
    });

    it('turns Validate into Next when a step is wrong, keeping the focus on it', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(WRONG);
      await userEvent.click(validateButton());

      expect(screen.queryByRole('button', { name: 'Validate' })).toBeNull();
      expect(document.activeElement).toBe(nextButton());
    });

    it('waits for Next after a wrong answer, however long the player reads', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(WRONG);
      validateThenStopTime();

      wait(60_000);
      expect(shown(FIRST_TEXT)).toBe(true);
      expect(screen.getByRole('status').textContent).toBe('Not quite');
    });

    it('starts again on Next: new syllable, no verdict, answers cleared and unlocked', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(WRONG);
      await userEvent.click(validateButton());
      await userEvent.click(nextButton());

      expect(shown(SECOND_TEXT)).toBe(true);
      expect(screen.queryByRole('status')).toBeNull();
      expect(choices().filter(checked)).toEqual([
        rowOf('toneMark').getByRole('radio', { name: 'None' }),
      ]);
      expect(choices().some(locked)).toBe(false);
      expect(validateButton().disabled).toBe(true);
    });
  });

  describe('validating a syllable with a tone mark', () => {
    const { consonantClass, toneMark, tone, ...middleSteps } = allAnswersOf(MARKED_SEED);

    it('locks the three middle rows once a mark is chosen', async () => {
      render(<TonesPage rng={seededRng(MARKED_SEED)} />);
      await answerWith({ toneMark });

      for (const step of ['vowelLength', 'finalKind', 'liveness'] as Step[]) {
        expect(rowOf(step).getAllByRole('radio').every(locked), step).toBe(true);
      }
    });

    it('can validate with the class, the mark and the tone only, and says Correct!', async () => {
      render(<TonesPage rng={seededRng(MARKED_SEED)} />);
      await answerWith({ consonantClass, toneMark, tone });
      expect(validateButton().disabled).toBe(false);

      await userEvent.click(validateButton());
      expect(screen.getByRole('status').textContent).toBe('Correct!');
    });

    it('marks a missed mark as wrong, and does not grade the middle rows', async () => {
      // The player keeps None, so answers all six rows.
      render(<TonesPage rng={seededRng(MARKED_SEED)} />);
      await answerWith({ consonantClass, ...middleSteps, tone });
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Not quite');
      const markRow = rowOf('toneMark');
      expect(markRow.getByRole('radio', { name: 'None (wrong)' })).toBeDefined();
      expect(
        markRow.getByRole('radio', {
          name: `${choiceName('toneMark', toneMark)} (the right answer)`,
        }),
      ).toBeDefined();
      expect(
        rowOf('vowelLength').getByRole('radio', {
          name: choiceName('vowelLength', middleSteps.vowelLength),
        }),
      ).toBeDefined();
    });
  });
});
