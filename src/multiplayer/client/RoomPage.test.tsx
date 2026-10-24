import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LeaveGuardProvider } from '../../site/LeaveGuardProvider';
import { SiteBar } from '../../site/SiteBar';
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

/** The room page under the site's bar, which holds Leave and End the game. */
function renderRoomInSite(socket: RoomSocket) {
  return render(
    <MemoryRouter initialEntries={['/room/K7P2QX']}>
      <LeaveGuardProvider>
        <SiteBar />
        <Routes>
          <Route path="/room/:roomId" element={<RoomPage socket={socket} />} />
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </LeaveGuardProvider>
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
  you: { pseudo: 'Host', avatar: 'elephant', isHost: true },
  host: { pseudo: 'Host', connected: true },
  players: [{ pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true }],
  phase: { kind: 'lobby' },
};

const QUESTION_VIEW: RoomView = {
  ...LOBBY_VIEW,
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
};

const ANNA_QUESTION_VIEW: RoomView = {
  ...QUESTION_VIEW,
  you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
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
      ['full', 'This lobby is full.'],
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

    expect(screen.getByRole('region', { name: 'Invite friends' })).toBeDefined();
    expect(screen.getByText('K7P2QX')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDefined();
  });

  it('treats a malformed ID as a missing room', () => {
    const fake = createFakeSocket();
    renderRoomAt('/room/xx', fake.socket);
    expect(screen.getByText('This lobby does not exist.')).toBeDefined();
  });

  describe('in the bar', () => {
    function inGame(view: RoomView) {
      const fake = createFakeSocket();
      renderRoomInSite(fake.socket);
      act(() => {
        fake.connectNow();
        fake.push('room:state', view);
      });
      return fake;
    }

    it('asks before leaving, then leaves the room and goes home', async () => {
      const fake = inGame(ANNA_QUESTION_VIEW);

      await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText(/Your points stay in the ranking/)).toBeDefined();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Keep playing' }));
      expect(fake.emitted.some((e) => e.event === 'room:leave')).toBe(false);

      await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Leave' }),
      );
      expect(screen.getByRole('heading', { name: 'Home' })).toBeDefined();
      await waitFor(() => expect(fake.emitted.some((e) => e.event === 'room:leave')).toBe(true));
    });

    it('tells the host leaving that another player takes over', async () => {
      inGame(QUESTION_VIEW);
      await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
      expect(screen.getByText(/Another player will take over as host/)).toBeDefined();
    });
  });
});
