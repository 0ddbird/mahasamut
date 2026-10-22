import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PlayerAnswers } from '../../../games/syllable/check';
import type { SyllableAnswers } from '../../../thai/answers';
import { SyllablePanel } from './SyllablePanel';

const READING_A: SyllableAnswers = {
  consonantClass: 'mid',
  vowelLength: 'long',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'mid',
};

const READING_B: SyllableAnswers = {
  consonantClass: 'mid',
  vowelLength: 'long',
  finalKind: 'none',
  liveness: 'live',
  tone: 'mid',
};

describe('SyllablePanel', () => {
  it('lets the player answer', async () => {
    const reported: PlayerAnswers[] = [];
    render(
      <SyllablePanel
        answers={{ toneMark: 'none' }}
        onChange={(a) => reported.push(a)}
        answerMode="detailed"
        locked={false}
      />,
    );

    const toneRow = screen.getByRole('group', { name: 'Tone' });
    await userEvent.click(within(toneRow).getByRole('radio', { name: 'Mid' }));
    expect(reported).toEqual([{ toneMark: 'none', tone: 'mid' }]);
  });

  it('locks the answers once validated', () => {
    render(
      <SyllablePanel
        answers={{ toneMark: 'none' }}
        onChange={() => {}}
        answerMode="detailed"
        locked
      />,
    );
    expect(screen.getAllByRole('radio').every((r) => r.matches(':disabled'))).toBe(true);
  });

  it('shows the correction against every accepted reading', () => {
    render(
      <SyllablePanel
        answers={{
          consonantClass: 'mid',
          toneMark: 'none',
          vowelLength: 'long',
          finalKind: 'sonorant',
          liveness: 'live',
          tone: 'mid',
        }}
        onChange={() => {}}
        answerMode="detailed"
        locked
        reveal={{
          game: 'syllable',
          analyses: [READING_A, READING_B],
          mark: 'none',
        }}
      />,
    );

    const finalRow = screen.getByRole('group', { name: 'Final' });
    expect(within(finalRow).getByRole('radio', { name: 'Sonorant (right)' })).toBeDefined();
    expect(within(finalRow).getByRole('radio', { name: 'None (also accepted)' })).toBeDefined();
  });

  it('shows the right answers when the player gave none', () => {
    render(
      <SyllablePanel
        answers={{}}
        onChange={() => {}}
        answerMode="toneOnly"
        locked
        reveal={{
          game: 'syllable',
          analyses: [READING_A],
          mark: 'none',
        }}
      />,
    );

    const toneRow = screen.getByRole('group', { name: 'Tone' });
    expect(within(toneRow).getByRole('radio', { name: 'Mid (the right answer)' })).toBeDefined();
  });
});
