import { render, screen, within } from '@testing-library/react';
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
  you: { pseudo: 'Host', avatar: 'elephant', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true },
    { pseudo: 'Anna', avatar: 'tiger', isHost: false, connected: false },
  ],
  phase: { kind: 'lobby' },
};

describe('Lobby', () => {
  it('shows the room settings to all players', () => {
    render(<Lobby view={BASE_VIEW} onStart={() => {}} />);
    const settings = screen.getByRole('region', { name: 'Settings' });
    expect(within(settings).getByText('10 questions')).toBeDefined();
    expect(within(settings).getByText('15 s per question')).toBeDefined();
    expect(within(settings).getByText('Tone only')).toBeDefined();
  });

  it('lets only the host start', async () => {
    const onStart = vi.fn();
    const { rerender } = render(<Lobby view={BASE_VIEW} onStart={onStart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledOnce();

    rerender(
      <Lobby
        view={{
          ...BASE_VIEW,
          you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
        }}
        onStart={onStart}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    expect(screen.getByText('Waiting for the host to start…')).toBeDefined();
  });

  it('lets a player cycle through Thai avatars', async () => {
    const onChangeAvatar = vi.fn();
    render(<Lobby view={BASE_VIEW} onStart={() => {}} onChangeAvatar={onChangeAvatar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next avatar' }));
    expect(onChangeAvatar).toHaveBeenCalledWith('tiger');
  });

  it('marks the host with a crown icon and shows absent players', () => {
    render(<Lobby view={BASE_VIEW} onStart={() => {}} />);
    const playersSection = screen.getByRole('region', { name: 'Players' });
    const items = within(playersSection).getAllByRole('listitem');
    expect(within(items[0]).getByText('Host')).toBeDefined();
    expect(within(items[0]).getByRole('img', { name: 'Host' })).toBeDefined();
    expect(within(items[1]).getByText('Anna')).toBeDefined();
    expect(within(items[1]).getByText('(away)')).toBeDefined();
  });

  it('tells the players when the host is away', () => {
    render(
      <Lobby
        view={{
          ...BASE_VIEW,
          you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
          host: { pseudo: 'Host', connected: false },
        }}
        onStart={() => {}}
      />,
    );
    expect(screen.getByText('The host is away.')).toBeDefined();
  });
});
