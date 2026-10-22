import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import type { RoomView } from '../protocol';
import { createFakeSocket } from './fakeSocket.test-utils';
import { RoomPage } from './RoomPage';
import type { RoomSocket } from './socket';

function renderRoomAt(path: string, socket?: RoomSocket) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/room/:roomId" element={<RoomPage socket={socket} />} />
        <Route path="/" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const LOBBY_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 10,
    answerMode: 'detailed',
    hasPassword: false,
  },
  you: { pseudo: 'Host', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [{ pseudo: 'Host', isHost: true, connected: true }],
  phase: { kind: 'lobby' },
};

describe('RoomPage', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('asks for a nickname, and a password if needed', () => {
    const fake = createFakeSocket();
    fake.replyTo('room:info', () => ({
      ok: true,
      status: 'open',
      game: 'syllable',
      hasPassword: true,
    }));

    renderRoomAt('/room/K7P2QX', fake.socket);
    act(() => fake.connectNow());

    expect(screen.getByLabelText('Your nickname')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('shows why the room cannot be joined', () => {
    for (const [status, message] of [
      ['started', 'This game has already started.'],
      ['full', 'This room is full.'],
    ] as const) {
      const fake = createFakeSocket();
      fake.replyTo('room:info', () => ({
        ok: true,
        status,
        game: 'syllable',
        hasPassword: false,
      }));
      const { unmount } = renderRoomAt('/room/K7P2QX', fake.socket);
      act(() => fake.connectNow());
      expect(screen.getByText(message)).toBeDefined();
      unmount();
    }
  });

  it('shows the lobby once in the room', () => {
    const fake = createFakeSocket();
    renderRoomAt('/room/K7P2QX', fake.socket);
    act(() => {
      fake.connectNow();
      fake.push('room:state', LOBBY_VIEW);
    });

    expect(screen.getByText('Room K7P2QX')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDefined();
  });

  it('treats a malformed ID as a missing room', () => {
    const fake = createFakeSocket();
    renderRoomAt('/room/xx', fake.socket);
    expect(screen.getByText('This room does not exist.')).toBeDefined();
  });
});
