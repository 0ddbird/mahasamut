import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateLobbyPage } from './CreateLobbyPage';
import { createFakeSocket } from './fakeSocket.test-utils';
import type { RoomSocket } from './socket';
import { loadToken } from './tokens';

function Dest() {
  const { pathname } = useLocation();
  return <p>{`At ${pathname}`}</p>;
}

function renderCreateLobby(socket?: RoomSocket) {
  return render(
    <MemoryRouter initialEntries={['/lobby']}>
      <Routes>
        <Route path="/lobby" element={<CreateLobbyPage socket={socket} />} />
        <Route path="/room/:roomId" element={<Dest />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CreateLobbyPage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('creates a lobby, saves the host token, and navigates to /room/<id>', async () => {
    const fake = createFakeSocket();
    fake.replyTo('room:create', () => ({ ok: true, roomId: 'K7P2QX', token: 'tok-host' }));
    renderCreateLobby(fake.socket);

    await userEvent.type(screen.getByLabelText('Your nickname'), 'Anna');
    await userEvent.type(screen.getByLabelText('Password (optional)'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Create lobby' }));

    expect(fake.emitted).toContainEqual({
      event: 'room:create',
      args: [
        {
          settings: { password: 'secret' },
          pseudo: 'Anna',
        },
      ],
    });
    expect(loadToken('K7P2QX')).toBe('tok-host');
    expect(screen.getByText('At /room/K7P2QX')).toBeDefined();
  });

  it('shows the server error when the lobby could not be created', async () => {
    const fake = createFakeSocket();
    fake.replyTo('room:create', () => ({ ok: false, error: 'server-full' }));
    renderCreateLobby(fake.socket);

    await userEvent.type(screen.getByLabelText('Your nickname'), 'Anna');
    await userEvent.click(screen.getByRole('button', { name: 'Create lobby' }));

    expect(screen.getByRole('alert').textContent).toBe(
      'The server is full, try again in a few minutes.',
    );
  });
});
