import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import { generateSyllable } from '../../thai/generator';
import { seededRng } from '../../thai/generator/seeded-rng.test-utils';
import { TonesPage } from './TonesPage';

/** The texts of the first `count` syllables drawn with `seed`. */
const textsDrawn = (seed: number, count: number) => {
  const rng = seededRng(seed);
  return Array.from({ length: count }, () => generateSyllable(rng).text);
};

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

  it('keeps the answers chosen, and clears them for the next syllable', async () => {
    render(<TonesPage rng={seededRng(7)} />);
    const longChoice = () => screen.getByRole('radio', { name: 'Long' }) as HTMLInputElement;

    await userEvent.click(longChoice());
    expect(longChoice().checked).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getAllByRole('radio').some((choice) => (choice as HTMLInputElement).checked),
    ).toBe(false);
  });

  describe('validating the answers', () => {
    const ROW_TITLES: Record<keyof SyllableAnswers, string> = {
      consonantClass: 'Consonant class',
      vowelLength: 'Vowel length',
      finalKind: 'Final',
      liveness: 'Syllable',
      tone: 'Tone',
    };

    /** Clicks, in each row, the choice of `answers`: 'falling' is labelled 'Falling'. */
    const answerWith = async (answers: Partial<SyllableAnswers>) => {
      for (const [step, value] of Object.entries(answers)) {
        const row = screen.getByRole('group', { name: ROW_TITLES[step as keyof SyllableAnswers] });
        const label = value.charAt(0).toUpperCase() + value.slice(1);
        await userEvent.click(within(row).getByRole('radio', { name: label }));
      }
    };

    const validateButton = () =>
      screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
    const choices = () => screen.getAllByRole('radio');
    // A choice is locked by its row's fieldset: its own `disabled` property stays false.
    const locked = (choice: HTMLElement) => choice.matches(':disabled');

    // The first syllable the page draws with seed 7, and its answers.
    const { answers: RIGHT } = generateSyllable(seededRng(7));

    it('can only validate once every row has an answer', async () => {
      render(<TonesPage rng={seededRng(7)} />);
      expect(validateButton().disabled).toBe(true);

      const { tone, ...allButTone } = RIGHT;
      await answerWith(allButTone);
      expect(validateButton().disabled).toBe(true);

      await answerWith({ tone });
      expect(validateButton().disabled).toBe(false);
    });

    it('says Correct! for the right answers, then locks them', async () => {
      render(<TonesPage rng={seededRng(7)} />);
      await answerWith(RIGHT);
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Correct!');
      expect(choices().every(locked)).toBe(true);
      expect(validateButton().disabled).toBe(true);
    });

    it('says Not quite when a step is wrong', async () => {
      render(<TonesPage rng={seededRng(7)} />);
      const wrongTone = RIGHT.tone === 'mid' ? 'low' : 'mid';
      await answerWith({ ...RIGHT, tone: wrongTone });
      await userEvent.click(validateButton());

      expect(screen.getByRole('status').textContent).toBe('Not quite');
    });

    it('starts again on Next: no verdict, answers unlocked', async () => {
      render(<TonesPage rng={seededRng(7)} />);
      await answerWith(RIGHT);
      await userEvent.click(validateButton());
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.queryByRole('status')).toBeNull();
      expect(choices().some(locked)).toBe(false);
    });
  });
});
