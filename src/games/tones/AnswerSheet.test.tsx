import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AnswerSheet } from './AnswerSheet';
import type { PlayerAnswers } from './check';

/** The labels of the choices in the row titled `title`. */
const choicesOf = (title: string) =>
  within(screen.getByRole('group', { name: title }))
    .getAllByRole('radio')
    .map((choice) => choice.closest('label')?.textContent);

describe('AnswerSheet', () => {
  it('shows the five steps in order, each with its choices', () => {
    render(<AnswerSheet answers={{}} onChange={() => {}} />);

    const titles = screen
      .getAllByRole('group')
      .map((row) => row.querySelector('legend')?.textContent);
    expect(titles).toEqual(['Consonant class', 'Vowel length', 'Final', 'Syllable', 'Tone']);

    expect(choicesOf('Consonant class')).toEqual(['High', 'Mid', 'Low']);
    expect(choicesOf('Vowel length')).toEqual(['Short', 'Long']);
    expect(choicesOf('Final')).toEqual(['None', 'Sonorant', 'Stop']);
    expect(choicesOf('Syllable')).toEqual(['Live', 'Dead']);
    expect(choicesOf('Tone')).toEqual(['Mid', 'Low', 'Falling', 'High', 'Rising']);
  });

  it('reports the answers with the new choice, keeping the others', async () => {
    const reported: PlayerAnswers[] = [];
    render(
      <AnswerSheet
        answers={{ vowelLength: 'long' }}
        onChange={(answers) => reported.push(answers)}
      />,
    );

    const toneRow = screen.getByRole('group', { name: 'Tone' });
    await userEvent.click(within(toneRow).getByRole('radio', { name: 'Falling' }));
    expect(reported).toEqual([{ vowelLength: 'long', tone: 'falling' }]);
  });

  it('tells apart the two "High" and "Mid" choices of the class and tone rows', async () => {
    const reported: PlayerAnswers[] = [];
    render(<AnswerSheet answers={{}} onChange={(answers) => reported.push(answers)} />);

    const classRow = screen.getByRole('group', { name: 'Consonant class' });
    await userEvent.click(within(classRow).getByRole('radio', { name: 'High' }));
    expect(reported).toEqual([{ consonantClass: 'high' }]);
  });
});
