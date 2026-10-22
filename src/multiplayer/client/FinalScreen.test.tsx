import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { RoomView } from '../protocol';
import { FinalScreen } from './FinalScreen';

const FINISHED_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 5,
    answerMode: 'detailed',
    hasPassword: false,
  },
  you: { pseudo: 'Host', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', isHost: true, connected: true },
    { pseudo: 'Anna', isHost: false, connected: true },
    { pseudo: 'Bob', isHost: false, connected: true },
    { pseudo: 'Cara', isHost: false, connected: true },
  ],
  phase: {
    kind: 'finished',
    ranking: [
      { rank: 1, pseudo: 'Anna', score: 300, isYou: false },
      { rank: 2, pseudo: 'Bob', score: 200, isYou: false },
      { rank: 2, pseudo: 'Host', score: 200, isYou: true },
      { rank: 4, pseudo: 'Cara', score: 80, isYou: false },
    ],
  },
};

describe('FinalScreen', () => {
  it('shows the podium with ties included, then the full ranking and a link home', () => {
    render(
      <MemoryRouter>
        <FinalScreen view={FINISHED_VIEW} />
      </MemoryRouter>,
    );

    const podiumSection = screen.getByRole('region', { name: 'Podium' });
    expect(within(podiumSection).getAllByRole('listitem')).toHaveLength(3);

    const fullSection = screen.getByRole('region', { name: 'Full ranking' });
    expect(within(fullSection).getAllByRole('listitem')).toHaveLength(4);

    expect(screen.getByRole('link', { name: 'Back to the home page' }).getAttribute('href')).toBe(
      '/',
    );
  });
});
