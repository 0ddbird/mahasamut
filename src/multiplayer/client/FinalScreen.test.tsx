import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { RoomView } from '../protocol';
import { FinalScreen } from './FinalScreen';

const FINISHED_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 10,
    answerMode: 'detailed',
    hasPassword: false,
  },
  you: { pseudo: 'Host', avatar: 'elephant', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true },
    { pseudo: 'Anna', avatar: 'tiger', isHost: false, connected: true },
    { pseudo: 'Bob', avatar: 'monkey', isHost: false, connected: true },
    { pseudo: 'Cara', avatar: 'lotus', isHost: false, connected: true },
    { pseudo: 'Dan', avatar: 'coconut', isHost: false, connected: true },
  ],
  phase: {
    kind: 'finished',
    ranking: [
      { rank: 1, pseudo: 'Anna', avatar: 'tiger', score: 200, isHost: false, isYou: false },
      { rank: 2, pseudo: 'Host', avatar: 'elephant', score: 150, isHost: false, isYou: true },
      { rank: 3, pseudo: 'Bob', avatar: 'monkey', score: 120, isHost: false, isYou: false },
      { rank: 3, pseudo: 'Cara', avatar: 'lotus', score: 120, isHost: false, isYou: false },
      { rank: 5, pseudo: 'Dan', avatar: 'coconut', score: 50, isHost: false, isYou: false },
    ],
    recap: [],
  },
};

describe('FinalScreen', () => {
  it('shows the 3-step podium (2nd, 1st, 3rd) with avatars and ties, then the full ranking and a link home', () => {
    render(
      <MemoryRouter>
        <FinalScreen view={FINISHED_VIEW} />
      </MemoryRouter>,
    );

    const podium = screen.getByRole('region', { name: 'Podium' });
    const step1 = within(podium).getByLabelText('Rank 1');
    const step2 = within(podium).getByLabelText('Rank 2');
    const step3 = within(podium).getByLabelText('Rank 3');

    expect(within(step1).getByText('Anna')).toBeDefined();
    expect(within(step1).getByRole('img', { name: 'Tiger' })).toBeDefined();

    expect(within(step2).getByText('Host')).toBeDefined();
    expect(within(step2).getByRole('img', { name: 'Elephant' })).toBeDefined();

    expect(within(step3).getByText('Bob')).toBeDefined();
    expect(within(step3).getByText('Cara')).toBeDefined();
    expect(within(podium).queryByText('Dan')).toBeNull();

    const full = screen.getByRole('region', { name: 'Full ranking' });
    expect(within(full).getAllByRole('listitem')).toHaveLength(5);

    expect(screen.getByRole('link', { name: 'Back to the home page' }).getAttribute('href')).toBe(
      '/',
    );
  });

  it('keeps all three podium steps even when there are only 2 players', () => {
    render(
      <MemoryRouter>
        <FinalScreen
          view={{
            ...FINISHED_VIEW,
            phase: {
              kind: 'finished',
              ranking: [
                {
                  rank: 1,
                  pseudo: 'Anna',
                  avatar: 'tiger',
                  score: 200,
                  isHost: false,
                  isYou: false,
                },
                {
                  rank: 2,
                  pseudo: 'Host',
                  avatar: 'elephant',
                  score: 150,
                  isHost: false,
                  isYou: true,
                },
              ],
              recap: [],
            },
          }}
        />
      </MemoryRouter>,
    );

    const podium = screen.getByRole('region', { name: 'Podium' });
    expect(within(podium).getByLabelText('Rank 1')).toBeDefined();
    expect(within(podium).getByLabelText('Rank 2')).toBeDefined();
    expect(within(podium).getByLabelText('Rank 3')).toBeDefined();
  });

  it('lists the answers under the full ranking and above the lobby button', () => {
    render(
      <MemoryRouter>
        <FinalScreen
          view={{
            ...FINISHED_VIEW,
            game: 'consonantClass',
            phase: {
              kind: 'finished',
              ranking: [
                {
                  rank: 1,
                  pseudo: 'Host',
                  avatar: 'elephant',
                  score: 100,
                  isHost: false,
                  isYou: true,
                },
              ],
              recap: [
                {
                  question: { game: 'consonantClass', text: 'ก' },
                  reveal: { game: 'consonantClass', consonantClass: 'mid' },
                  answer: { game: 'consonantClass', consonantClass: 'mid' },
                  correct: true,
                },
                {
                  question: { game: 'consonantClass', text: 'ฎ' },
                  reveal: { game: 'consonantClass', consonantClass: 'mid' },
                  answer: null,
                  correct: false,
                },
              ],
            },
          }}
        />
      </MemoryRouter>,
    );

    const recap = screen.getByRole('region', { name: 'Your answers' });
    expect(within(recap).getAllByRole('listitem')).toHaveLength(2);

    const full = screen.getByRole('region', { name: 'Full ranking' });
    const button = screen.getByRole('button', { name: 'Back to lobby' });
    expect(full.compareDocumentPosition(recap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recap.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('reports a question of the recap as made in a multiplayer game', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    render(
      <MemoryRouter>
        <FinalScreen
          send={send}
          view={{
            ...FINISHED_VIEW,
            game: 'consonantClass',
            phase: {
              kind: 'finished',
              ranking: [
                {
                  rank: 1,
                  pseudo: 'Host',
                  avatar: 'elephant',
                  score: 100,
                  isHost: false,
                  isYou: true,
                },
              ],
              recap: [
                {
                  question: { game: 'consonantClass', text: 'ก' },
                  reveal: { game: 'consonantClass', consonantClass: 'mid' },
                  answer: { game: 'consonantClass', consonantClass: 'mid' },
                  correct: true,
                },
              ],
            },
          }}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Report the question ก' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'The expected class is wrong' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ where: 'recap', mode: 'multi' }));
  });

  it('shows no answers when no question was played', () => {
    render(
      <MemoryRouter>
        <FinalScreen view={FINISHED_VIEW} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('region', { name: 'Your answers' })).toBeNull();
  });

  it('lets the host bring everyone back to the lobby', async () => {
    const onReturnToLobby = vi.fn();
    render(
      <MemoryRouter>
        <FinalScreen view={FINISHED_VIEW} onReturnToLobby={onReturnToLobby} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Back to lobby' }));
    expect(onReturnToLobby).toHaveBeenCalledOnce();
  });
});
