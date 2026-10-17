import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AnswerSheet } from './AnswerSheet';
import type { PlayerAnswers } from './check';

const rowTitled = (title: string) => screen.getByRole('group', { name: title });

/** The labels of the choices in the row titled `title`. */
const choicesOf = (title: string) =>
  within(rowTitled(title))
    .getAllByRole('radio')
    .map((choice) => choice.closest('label')?.textContent);

/** Code points of a string, so tests check exact characters rather than look-alike glyphs. */
const codePoints = (text: string | null | undefined) =>
  [...(text ?? '')].map((char) => char.codePointAt(0));

describe('AnswerSheet', () => {
  it('shows the six steps in order', () => {
    render(<AnswerSheet answers={{}} onChange={() => {}} />);

    const titles = screen
      .getAllByRole('group')
      .map((row) => row.querySelector('legend')?.textContent);
    expect(titles).toEqual([
      'Consonant class',
      'Tone mark',
      'Vowel length',
      'Final',
      'Syllable',
      'Tone',
    ]);
  });

  it('gives each step its choices', () => {
    render(<AnswerSheet answers={{}} onChange={() => {}} />);

    expect(choicesOf('Consonant class')).toEqual(['High', 'Mid', 'Low']);
    expect(choicesOf('Vowel length')).toEqual(['Short', 'Long']);
    expect(choicesOf('Final')).toEqual(['None', 'Sonorant', 'Stop']);
    expect(choicesOf('Syllable')).toEqual(['Live', 'Dead']);
    expect(choicesOf('Tone')).toEqual(['Mid', 'Low', 'Falling', 'High', 'Rising']);
  });

  it('names the tone marks for screen readers, and shows their sign on a dotted circle', () => {
    render(<AnswerSheet answers={{}} onChange={() => {}} />);
    const markRow = within(rowTitled('Tone mark'));

    // prettier-ignore
    const MARKS: [string, number[]][] = [
      ['Mai eek', [0x25cc, 0x0e48]], // ◌่
      ['Mai tho', [0x25cc, 0x0e49]], // ◌้
      ['Mai trii', [0x25cc, 0x0e4a]], // ◌๊
      ['Mai djattawaa', [0x25cc, 0x0e4b]], // ◌๋
    ];
    expect(markRow.getByRole('radio', { name: 'None' })).toBeDefined();
    for (const [name, sign] of MARKS) {
      const label = markRow.getByRole('radio', { name }).closest('label');
      expect(codePoints(label?.querySelector('[lang="th"]')?.textContent), name).toEqual(sign);
    }
  });

  it('reports the answers with the new choice, keeping the others', async () => {
    const reported: PlayerAnswers[] = [];
    render(
      <AnswerSheet
        answers={{ vowelLength: 'long' }}
        onChange={(answers) => reported.push(answers)}
      />,
    );

    await userEvent.click(within(rowTitled('Tone')).getByRole('radio', { name: 'Falling' }));
    expect(reported).toEqual([{ vowelLength: 'long', tone: 'falling' }]);
  });

  it('tells apart the two "High" and "Mid" choices of the class and tone rows', async () => {
    const reported: PlayerAnswers[] = [];
    render(<AnswerSheet answers={{}} onChange={(answers) => reported.push(answers)} />);

    await userEvent.click(
      within(rowTitled('Consonant class')).getByRole('radio', { name: 'High' }),
    );
    expect(reported).toEqual([{ consonantClass: 'high' }]);
  });

  describe('once a tone mark is chosen', () => {
    const SKIPPED = ['Vowel length', 'Final', 'Syllable'];
    const locked = (title: string) =>
      within(rowTitled(title))
        .getAllByRole('radio')
        .every((choice) => choice.matches(':disabled'));

    it('locks the three steps the tone no longer depends on, and says why', () => {
      render(<AnswerSheet answers={{ toneMark: 'eek' }} onChange={() => {}} />);

      for (const title of SKIPPED) {
        expect(locked(title), title).toBe(true);
        expect(rowTitled(title).textContent, title).toMatch(/Not needed with a tone mark/);
      }
      expect(locked('Consonant class')).toBe(false);
      expect(locked('Tone')).toBe(false);
    });

    it('leaves them open with no mark', () => {
      render(<AnswerSheet answers={{ toneMark: 'none' }} onChange={() => {}} />);
      for (const title of SKIPPED) expect(locked(title), title).toBe(false);
    });
  });
});
