import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { generateSyllable } from '../../thai/generator';
import type { Syllable } from '../../thai/generator';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
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

/** All six answers of the first syllable of `seed`, its tone mark included. */
const allAnswersOf = (seed: number): GameAnswers => {
  const { answers, parts } = firstSyllable(seed);
  return { ...answers, toneMark: parts.mark };
};

const validateButton = () => screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
const choices = () => screen.getAllByRole('radio');
// A choice is locked by its row's fieldset: its own `disabled` property stays false.
const locked = (choice: HTMLElement) => choice.matches(':disabled');
const checked = (choice: HTMLElement) => (choice as HTMLInputElement).checked;

describe('TonesPage', () => {
  it('shows a syllable drawn by the generator', () => {
    const [first] = textsDrawn(7, 1);
    render(<TonesPage rng={seededRng(7)} />);
    expect(screen.getByText(first ?? '').getAttribute('lang')).toBe('th');
  });

  it('draws the next syllable when Next is clicked', async () => {
    const [, second] = textsDrawn(7, 2);
    render(<TonesPage rng={seededRng(7)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(second ?? '').getAttribute('lang')).toBe('th');
  });

  it('starts with no tone mark chosen, and nothing else', () => {
    render(<TonesPage rng={seededRng(7)} />);
    const chosen = choices().filter(checked);
    expect(chosen).toEqual([rowOf('toneMark').getByRole('radio', { name: 'None' })]);
  });

  it('keeps the answers chosen, and clears them for the next syllable', async () => {
    render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
    const longChoice = () => rowOf('vowelLength').getByRole('radio', { name: 'Long' });

    await userEvent.click(longChoice());
    expect(checked(longChoice())).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(choices().filter(checked)).toEqual([
      rowOf('toneMark').getByRole('radio', { name: 'None' }),
    ]);
  });

  describe('validating a syllable with no tone mark', () => {
    const RIGHT = allAnswersOf(UNMARKED_SEED);

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
    });

    it('says Not quite when a step is wrong, and marks each row', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      const wrongTone = RIGHT.tone === 'mid' ? 'low' : 'mid';
      await answerWith({ ...RIGHT, tone: wrongTone });
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Not quite');
      const toneRow = rowOf('tone');
      expect(
        toneRow.getByRole('radio', { name: `${choiceName('tone', wrongTone)} (wrong)` }),
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

    it('starts again on Next: no verdict, answers unlocked', async () => {
      render(<TonesPage rng={seededRng(UNMARKED_SEED)} />);
      await answerWith(RIGHT);
      await userEvent.click(validateButton());
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.queryByRole('status')).toBeNull();
      expect(choices().some(locked)).toBe(false);
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
