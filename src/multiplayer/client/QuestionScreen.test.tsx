import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionError, GameAnswer, RoomView } from '../protocol';
import { QuestionScreen } from './QuestionScreen';

function makeQuestionView(overrides: Partial<RoomView> = {}): RoomView {
  return {
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
      kind: 'question',
      index: 0,
      question: { game: 'syllable', text: 'กา' },
      remainingMs: 15_000,
      yourAnswer: null,
      answered: [],
    },
    ...overrides,
  };
}

describe('QuestionScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the question, its number and the time left, ticking down', () => {
    vi.useFakeTimers();
    render(<QuestionScreen view={makeQuestionView()} onAnswer={async () => null} />);

    expect(screen.getByText('1 / 5')).toBeDefined();
    expect(screen.getByText('กา')).toBeDefined();
    expect(screen.getByRole('timer', { name: '15 seconds' })).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('timer', { name: '14 seconds' })).toBeDefined();
  });

  it('validates only a complete answer, sends it, and locks the panel', async () => {
    const sent: GameAnswer[] = [];
    const view = makeQuestionView();
    const { rerender } = render(
      <QuestionScreen
        view={view}
        onAnswer={async (a) => {
          sent.push(a);
          return null;
        }}
      />,
    );

    const validateBtn = screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement;
    expect(validateBtn.disabled).toBe(true);

    const toneRow = screen.getByRole('group', { name: 'Tone' });
    await userEvent.click(within(toneRow).getByRole('radio', { name: 'Mid' }));
    expect(validateBtn.disabled).toBe(false);

    await userEvent.click(validateBtn);
    expect(sent).toEqual([{ game: 'syllable', answers: { toneMark: 'none', tone: 'mid' } }]);

    rerender(
      <QuestionScreen
        view={makeQuestionView({
          phase: {
            kind: 'question',
            index: 0,
            question: { game: 'syllable', text: 'กา' },
            remainingMs: 12_000,
            yourAnswer: { game: 'syllable', answers: { toneMark: 'none', tone: 'mid' } },
            answered: ['Host'],
          },
        })}
        onAnswer={async () => null}
      />,
    );

    expect(screen.getAllByRole('radio').every((r) => r.matches(':disabled'))).toBe(true);
    expect(screen.getByText('Answer sent.')).toBeDefined();
  });

  it('shows an answer already sent after a reload', () => {
    const view = makeQuestionView({
      phase: {
        kind: 'question',
        index: 0,
        question: { game: 'syllable', text: 'กา' },
        remainingMs: 10_000,
        yourAnswer: { game: 'syllable', answers: { tone: 'low' } },
        answered: ['Host'],
      },
    });
    render(<QuestionScreen view={view} onAnswer={async () => null} />);

    const lowRadio = screen.getByRole('radio', { name: 'Low' }) as HTMLInputElement;
    expect(lowRadio.checked).toBe(true);
    expect(lowRadio.matches(':disabled')).toBe(true);
    expect(screen.getByText('Answer sent.')).toBeDefined();
  });

  it('says when the answer came too late', async () => {
    render(
      <QuestionScreen
        view={makeQuestionView()}
        onAnswer={async (): Promise<ActionError> => 'too-late'}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Mid' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(screen.getByRole('alert').textContent).toBe('Too late!');
  });

  it('sends the answer in Consonant classes and in Vowel sounds', async () => {
    const sent: GameAnswer[] = [];
    const { unmount } = render(
      <QuestionScreen
        view={makeQuestionView({
          game: 'consonantClass',
          phase: {
            kind: 'question',
            index: 0,
            question: { game: 'consonantClass', text: 'ข' },
            remainingMs: 15_000,
            yourAnswer: null,
            answered: [],
          },
        })}
        onAnswer={async (a) => {
          sent.push(a);
          return null;
        }}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'High' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(sent).toEqual([{ game: 'consonantClass', consonantClass: 'high' }]);
    unmount();

    render(
      <QuestionScreen
        view={makeQuestionView({
          game: 'vowel',
          phase: {
            kind: 'question',
            index: 0,
            question: { game: 'vowel', text: 'อา', choices: ['a', 'aː', 'i', 'iː'] },
            remainingMs: 15_000,
            yourAnswer: null,
            answered: [],
          },
        })}
        onAnswer={async (a) => {
          sent.push(a);
          return null;
        }}
        play={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'a, long' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(sent).toEqual([
      { game: 'consonantClass', consonantClass: 'high' },
      { game: 'vowel', sound: 'aː' },
    ]);
  });

  it('lists the players with the host crown, ticks those who answered, and dims those away', () => {
    const view = makeQuestionView({
      players: [
        { pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true },
        { pseudo: 'Anna', avatar: 'tiger', isHost: false, connected: true },
        { pseudo: 'Bob', avatar: 'lotus', isHost: false, connected: false },
      ],
    });
    if (view.phase.kind === 'question') view.phase.answered = ['Anna'];
    render(<QuestionScreen view={view} onAnswer={async () => null} />);

    const players = within(screen.getByRole('region', { name: 'Players' }));
    expect(players.getByRole('heading').textContent).toBe('Players (3)');
    const [host, anna, bob] = players.getAllByRole('listitem');
    expect(host.textContent).toBe('Host (you)');
    expect(within(host).getByRole('img', { name: 'Host' })).toBeDefined();
    expect(within(host).queryByRole('img', { name: 'Answered' })).toBeNull();
    expect(within(anna).getByRole('img', { name: 'Answered' })).toBeDefined();
    expect(within(anna).queryByRole('img', { name: 'Host' })).toBeNull();
    expect(bob.getAttribute('data-away')).toBe('true');
    expect(bob.textContent).toBe('Bob(away)');
  });
});
