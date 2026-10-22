import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomView } from '../protocol';
import { Lobby } from './Lobby';

const BASE_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 10,
    answerMode: 'toneOnly',
    hasPassword: false,
  },
  you: { pseudo: 'Host', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', isHost: true, connected: true },
    { pseudo: 'Anna', isHost: false, connected: false },
  ],
  phase: { kind: 'lobby' },
};

describe('Lobby', () => {
  it('lets only the host start', async () => {
    const onStart = vi.fn();
    const { rerender } = render(<Lobby view={BASE_VIEW} onStart={onStart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledOnce();

    rerender(
      <Lobby
        view={{
          ...BASE_VIEW,
          you: { pseudo: 'Anna', isHost: false },
        }}
        onStart={onStart}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    expect(screen.getByText('Waiting for the host to start…')).toBeDefined();
  });

  it('marks the host and the absent players', () => {
    render(<Lobby view={BASE_VIEW} onStart={() => {}} />);
    expect(screen.getByText(/Host.*\(host\)/)).toBeDefined();
    expect(screen.getByText(/Anna.*\(away\)/)).toBeDefined();
  });

  it('tells the players when the host is away', () => {
    render(
      <Lobby
        view={{
          ...BASE_VIEW,
          you: { pseudo: 'Anna', isHost: false },
          host: { pseudo: 'Host', connected: false },
        }}
        onStart={() => {}}
      />,
    );
    expect(screen.getByText('The host is away.')).toBeDefined();
  });
});
