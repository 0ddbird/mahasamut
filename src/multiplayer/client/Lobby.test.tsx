import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GAME, GAME_SAMPLES } from '../../games/shared/games';
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
  it('shows all three Thai game tiles to everyone, letting the host switch games and settings', async () => {
    const onUpdateSettings = vi.fn();
    const { rerender } = render(
      <Lobby view={BASE_VIEW} onStart={() => {}} onUpdateSettings={onUpdateSettings} />,
    );

    const gameGroup = screen.getByRole('group', { name: 'Game' });
    expect(within(gameGroup).getByText(GAME_SAMPLES[GAME.Vowel])).toBeDefined();
    expect(within(gameGroup).getByText(GAME_SAMPLES[GAME.ConsonantClass])).toBeDefined();
    expect(within(gameGroup).getByText(GAME_SAMPLES[GAME.Syllable])).toBeDefined();

    await userEvent.click(within(gameGroup).getByRole('radio', { name: /Vowel sounds/ }));
    expect(onUpdateSettings).toHaveBeenCalledWith({
      game: 'vowel',
      questionCount: 10,
      secondsPerQuestion: 15,
      answerMode: 'toneOnly',
    });

    await userEvent.click(screen.getByRole('button', { name: 'More questions' }));
    expect(onUpdateSettings).toHaveBeenCalledWith({
      game: 'syllable',
      questionCount: 11,
      secondsPerQuestion: 15,
      answerMode: 'toneOnly',
    });

    rerender(
      <Lobby
        view={{
          ...BASE_VIEW,
          you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
        }}
        onStart={() => {}}
      />,
    );
    expect(
      within(screen.getByRole('group', { name: 'Game' })).getByText(GAME_SAMPLES[GAME.Vowel]),
    ).toBeDefined();
    const settings = screen.getByRole('region', { name: 'Settings' });
    expect(within(settings).getByText('10 questions')).toBeDefined();
    expect(within(settings).getByText('15 s per question')).toBeDefined();
    expect(within(settings).getByText('Tone only')).toBeDefined();
  });

  it('shows Invite friends with the lobby code and confirms when the link is copied', async () => {
    render(<Lobby view={BASE_VIEW} onStart={() => {}} />);

    const invite = screen.getByRole('region', { name: 'Invite friends' });
    expect(within(invite).getByText('K7P2QX')).toBeDefined();
    await userEvent.click(within(invite).getByRole('button', { name: 'Copy the link' }));
    expect(within(invite).getByRole('button', { name: '✓ Link copied!' })).toBeDefined();
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
          host: { pseudo: 'Somchai', connected: true },
        }}
        onStart={onStart}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    expect(screen.getByText('Waiting for Somchai to start…')).toBeDefined();
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
          host: { pseudo: 'Somchai', connected: false },
        }}
        onStart={() => {}}
      />,
    );
    expect(screen.getByText('Somchai is away.')).toBeDefined();
  });
});
