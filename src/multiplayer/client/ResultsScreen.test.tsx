import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomView } from '../protocol';
import { ResultsScreen } from './ResultsScreen';

const BASE_RESULTS_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 5,
    answerMode: 'toneOnly',
    hasPassword: false,
  },
  you: { pseudo: 'Host', avatar: 'elephant', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true },
    { pseudo: 'Anna', avatar: 'tiger', isHost: false, connected: true },
  ],
  phase: {
    kind: 'results',
    index: 0,
    question: { game: 'syllable', text: 'กา' },
    reveal: {
      game: 'syllable',
      analyses: [
        {
          consonantClass: 'mid',
          vowelLength: 'long',
          finalKind: 'none',
          liveness: 'live',
          tone: 'mid',
        },
      ],
      mark: 'none',
    },
    you: {
      answer: { game: 'syllable', answers: { tone: 'mid' } },
      correct: true,
      points: 92,
    },
    ranking: [
      { rank: 1, pseudo: 'Host', avatar: 'elephant', score: 92, isHost: false, isYou: true },
      { rank: 2, pseudo: 'Anna', avatar: 'tiger', score: 0, isHost: false, isYou: false },
    ],
    isLast: false,
  },
};

describe('ResultsScreen', () => {
  it('says Correct! with the points won and lets the player listen to the word', async () => {
    const played: string[] = [];
    render(
      <ResultsScreen
        view={BASE_RESULTS_VIEW}
        onNext={() => {}}
        soundOf={() => '/audio/words/w1.mp3'}
        play={(url) => played.push(url)}
      />,
    );

    expect(screen.getByRole('status').textContent).toBe('Correct!');
    expect(screen.getByText('+92')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(played).toEqual(['/audio/words/w1.mp3']);
  });

  it('shows the correction rows of a wrong answer and when the player gave none', () => {
    const wrongView: RoomView = {
      ...BASE_RESULTS_VIEW,
      phase:
        BASE_RESULTS_VIEW.phase.kind === 'results'
          ? {
              ...BASE_RESULTS_VIEW.phase,
              you: {
                answer: { game: 'syllable', answers: { tone: 'low' } },
                correct: false,
                points: 0,
              },
            }
          : BASE_RESULTS_VIEW.phase,
    };
    const { rerender } = render(<ResultsScreen view={wrongView} onNext={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Low (wrong)' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Mid (the right answer)' })).toBeDefined();

    const emptyView: RoomView = {
      ...BASE_RESULTS_VIEW,
      phase:
        BASE_RESULTS_VIEW.phase.kind === 'results'
          ? {
              ...BASE_RESULTS_VIEW.phase,
              you: { answer: null, correct: false, points: 0 },
            }
          : BASE_RESULTS_VIEW.phase,
    };
    rerender(<ResultsScreen view={emptyView} onNext={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Mid (the right answer)' })).toBeDefined();
  });

  it('offers Next to the host only, and See the podium after the last question', async () => {
    const onNext = vi.fn();
    const { rerender } = render(<ResultsScreen view={BASE_RESULTS_VIEW} onNext={onNext} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalledOnce();

    rerender(
      <ResultsScreen
        view={{
          ...BASE_RESULTS_VIEW,
          phase:
            BASE_RESULTS_VIEW.phase.kind === 'results'
              ? { ...BASE_RESULTS_VIEW.phase, isLast: true }
              : BASE_RESULTS_VIEW.phase,
        }}
        onNext={onNext}
      />,
    );
    expect(screen.getByRole('button', { name: 'See the podium' })).toBeDefined();

    rerender(
      <ResultsScreen
        view={{
          ...BASE_RESULTS_VIEW,
          you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
        }}
        onNext={onNext}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByText('Waiting for the host…')).toBeDefined();
  });

  it('tells the players when the game is paused because the host is away', () => {
    render(
      <ResultsScreen
        view={{
          ...BASE_RESULTS_VIEW,
          you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
          host: { pseudo: 'Host', connected: false },
        }}
        onNext={() => {}}
      />,
    );
    expect(screen.getByText('The host is away. The game is paused.')).toBeDefined();
  });
});
