import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import { AnswerSheet } from './AnswerSheet';
import { checkAnswers } from './check';
import type { PlayerAnswers } from './check';

const rowTitled = (title: string) => screen.getByRole('group', { name: title });

/** The labels of the choices in the row titled `title`. */
const choicesOf = (title: string) =>
  within(rowTitled(title))
    .getAllByRole('radio')
    .map((choice) => choice.closest('label')?.textContent);

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

  it('names the tone marks for screen readers, and draws their sign without a dotted circle', () => {
    render(<AnswerSheet answers={{}} onChange={() => {}} />);
    const markRow = within(rowTitled('Tone mark'));

    expect(markRow.getByRole('radio', { name: 'None' })).toBeDefined();
    for (const name of ['Mai eek', 'Mai tho', 'Mai trii', 'Mai djattawaa']) {
      const label = markRow.getByRole('radio', { name }).closest('label');
      expect(label?.querySelector('svg path'), name).not.toBeNull();
      expect(label?.textContent, name).not.toContain('◌');
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

  describe('in tone-only mode', () => {
    // ไม่: low class, short vowel, sonorant final, live, ่ gives a falling tone.
    const MAI: SyllableAnswers = {
      consonantClass: 'low',
      vowelLength: 'short',
      finalKind: 'sonorant',
      liveness: 'live',
      tone: 'falling',
    };

    it('shows the Tone row only', () => {
      render(<AnswerSheet answers={{}} onChange={() => {}} answerMode="toneOnly" />);
      const titles = screen
        .getAllByRole('group')
        .map((row) => row.querySelector('legend')?.textContent);
      expect(titles).toEqual(['Tone']);
    });

    it('shows the tone correction, and no other row', () => {
      const answers: PlayerAnswers = { tone: 'high' };
      const result = checkAnswers(answers, [MAI], 'eek', 'toneOnly');
      render(
        <AnswerSheet
          answers={answers}
          onChange={() => {}}
          answerMode="toneOnly"
          correction={{ result, analyses: [MAI] }}
        />,
      );

      expect(screen.getAllByRole('group')).toHaveLength(1);
      const tone = within(rowTitled('Tone'));
      expect(tone.getByRole('radio', { name: 'High (wrong)' })).toBeDefined();
      expect(tone.getByRole('radio', { name: 'Falling (the right answer)' })).toBeDefined();
    });
  });

  it('locks every row when locked, with no feedback', () => {
    render(<AnswerSheet answers={{ toneMark: 'none' }} onChange={() => {}} locked />);

    const radios = screen.getAllByRole('radio');
    expect(radios.every((radio) => radio.matches(':disabled'))).toBe(true);
    for (const radio of radios) {
      expect(radio.getAttribute('aria-label') ?? '').not.toMatch(/\(right\)|\(wrong\)/);
    }
  });
});
