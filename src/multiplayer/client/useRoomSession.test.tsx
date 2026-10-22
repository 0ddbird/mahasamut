import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RoomView } from '../protocol';
import { createFakeSocket } from './fakeSocket.test-utils';
import { loadToken, saveToken } from './tokens';
import { useRoomSession } from './useRoomSession';

const SAMPLE_VIEW: RoomView = {
  roomId: 'K7P2QX',
  game: 'syllable',
  settings: {
    secondsPerQuestion: 15,
    questionCount: 10,
    answerMode: 'detailed',
    hasPassword: false,
  },
  you: { pseudo: 'Anna', avatar: 'tiger', isHost: false },
  host: { pseudo: 'Host', connected: true },
  players: [
    { pseudo: 'Host', avatar: 'elephant', isHost: true, connected: true },
    { pseudo: 'Anna', avatar: 'tiger', isHost: false, connected: true },
  ],
  phase: { kind: 'lobby' },
};

describe('useRoomSession', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('asks to join an open room', () => {
    const fake = createFakeSocket();
    fake.replyTo('room:info', () => ({
      ok: true,
      status: 'open',
      game: 'syllable',
      hasPassword: true,
    }));

    const { result } = renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => fake.connectNow());

    expect(result.current[0]).toEqual({
      status: 'joining',
      game: 'syllable',
      hasPassword: true,
    });
  });

  it('says why a room cannot be joined', () => {
    const fake1 = createFakeSocket();
    fake1.replyTo('room:info', () => ({
      ok: true,
      status: 'started',
      game: 'syllable',
      hasPassword: false,
    }));
    const { result: r1 } = renderHook(() => useRoomSession(fake1.socket, 'K7P2QX'));
    act(() => fake1.connectNow());
    expect(r1.current[0]).toEqual({ status: 'unavailable', reason: 'started' });

    const fake2 = createFakeSocket();
    fake2.replyTo('room:info', () => ({ ok: false, error: 'not-found' }));
    const { result: r2 } = renderHook(() => useRoomSession(fake2.socket, 'K7P2QX'));
    act(() => fake2.connectNow());
    expect(r2.current[0]).toEqual({ status: 'unavailable', reason: 'not-found' });
  });

  it('keeps the token after joining, and shows the room', async () => {
    const fake = createFakeSocket();
    fake.replyTo('room:info', () => ({
      ok: true,
      status: 'open',
      game: 'syllable',
      hasPassword: false,
    }));
    fake.replyTo('room:join', () => ({ ok: true, token: 'tok-anna' }));

    const { result } = renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => fake.connectNow());

    let joinErr: string | null = 'not-called';
    await act(async () => {
      joinErr = await result.current[1].join('Anna', null);
    });
    expect(joinErr).toBeNull();
    expect(loadToken('K7P2QX')).toBe('tok-anna');

    act(() => fake.push('room:state', SAMPLE_VIEW));
    expect(result.current[0]).toEqual({ status: 'in-room', view: SAMPLE_VIEW });
  });

  it('returns the join error', async () => {
    const fake = createFakeSocket();
    fake.replyTo('room:info', () => ({
      ok: true,
      status: 'open',
      game: 'syllable',
      hasPassword: false,
    }));
    fake.replyTo('room:join', () => ({ ok: false, error: 'pseudo-taken' }));

    const { result } = renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => fake.connectNow());

    let joinErr: string | null = null;
    await act(async () => {
      joinErr = await result.current[1].join('Anna', null);
    });
    expect(joinErr).toBe('pseudo-taken');
  });

  it('resumes with the saved token on every connection', () => {
    saveToken('K7P2QX', 'tok-saved');
    const fake = createFakeSocket();
    fake.replyTo('room:resume', () => ({ ok: true }));

    renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => fake.connectNow());

    expect(fake.emitted).toContainEqual({
      event: 'room:resume',
      args: [{ roomId: 'K7P2QX', token: 'tok-saved' }],
    });

    fake.emitted.length = 0;
    act(() => {
      fake.dropConnection();
      fake.connectNow();
    });

    expect(fake.emitted).toContainEqual({
      event: 'room:resume',
      args: [{ roomId: 'K7P2QX', token: 'tok-saved' }],
    });
  });

  it('forgets a token the server no longer knows', () => {
    saveToken('K7P2QX', 'tok-stale');
    const fake = createFakeSocket();
    fake.replyTo('room:resume', () => ({ ok: false, error: 'unknown-token' }));
    fake.replyTo('room:info', () => ({
      ok: true,
      status: 'open',
      game: 'vowel',
      hasPassword: false,
    }));

    const { result } = renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => fake.connectNow());

    expect(loadToken('K7P2QX')).toBeNull();
    expect(result.current[0]).toEqual({
      status: 'joining',
      game: 'vowel',
      hasPassword: false,
    });
  });

  it('stops when the room is closed', () => {
    saveToken('K7P2QX', 'tok-saved');
    const fake = createFakeSocket();
    fake.replyTo('room:resume', () => ({ ok: true }));

    const { result } = renderHook(() => useRoomSession(fake.socket, 'K7P2QX'));
    act(() => {
      fake.connectNow();
      fake.push('room:state', SAMPLE_VIEW);
    });
    expect(result.current[0].status).toBe('in-room');

    act(() => fake.push('room:closed'));
    expect(result.current[0]).toEqual({ status: 'unavailable', reason: 'closed' });
    expect(loadToken('K7P2QX')).toBeNull();
  });
});
