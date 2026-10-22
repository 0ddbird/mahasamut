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
      { rank: 1, pseudo: 'Anna', avatar: 'tiger', score: 200, isYou: false },
      { rank: 2, pseudo: 'Host', avatar: 'elephant', score: 150, isYou: true },
      { rank: 3, pseudo: 'Bob', avatar: 'monkey', score: 120, isYou: false },
      { rank: 3, pseudo: 'Cara', avatar: 'lotus', score: 120, isYou: false },
      { rank: 5, pseudo: 'Dan', avatar: 'coconut', score: 50, isYou: false },
    ],
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
                { rank: 1, pseudo: 'Anna', avatar: 'tiger', score: 200, isYou: false },
                { rank: 2, pseudo: 'Host', avatar: 'elephant', score: 150, isYou: true },
              ],
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
