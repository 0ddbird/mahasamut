import type { AddressInfo } from 'node:net';
import { io as createClient } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  ClientToServerEvents,
  RoomView,
  ServerToClientEvents,
} from '../src/multiplayer/protocol';
import { createRoomServer } from './app';
import { IDLE_ROOM_MS } from './limits';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

const SETTINGS = {
  game: 'syllable',
  secondsPerQuestion: 15,
  questionCount: 5,
  answerMode: 'toneOnly',
  password: '',
};

function waitForEvent<T>(client: TestClient, event: 'room:state' | 'room:closed'): Promise<T> {
  return new Promise((resolve) => {
    client.once(event, (payload?: unknown) => resolve(payload as T));
  });
}

describe('Socket.IO room server', () => {
  let now = 1_000;
  let server: ReturnType<typeof createRoomServer>;
  let url = '';
  const clients: TestClient[] = [];

  function connectClient(): Promise<TestClient> {
    return new Promise((resolve) => {
      const client: TestClient = createClient(url, {
        transports: ['websocket'],
        reconnection: false,
      });
      clients.push(client);
      client.once('connect', () => resolve(client));
    });
  }

  beforeEach(async () => {
    now = 1_000;
    server = createRoomServer({ now: () => now });
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await server.close();
  });

  it('creates a room and sends its state to the host', async () => {
    const host = await connectClient();
    const statePromise = waitForEvent<RoomView>(host, 'room:state');
    const res = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });

    expect(res.ok).toBe(true);
    const view = await statePromise;
    expect(view.phase).toEqual({ kind: 'lobby' });
    expect(view.you).toEqual(expect.objectContaining({ pseudo: 'Host', isHost: true }));
    expect(view.host).toEqual({ pseudo: 'Host', connected: true });
  });

  it('tells a newcomer about the room before they join', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');

    const guest = await connectClient();
    const info = await guest.emitWithAck('room:info', { roomId: created.roomId });
    expect(info).toEqual({
      ok: true,
      game: 'syllable',
      hasPassword: false,
      status: 'open',
    });

    const missing = await guest.emitWithAck('room:info', { roomId: '222222' });
    expect(missing).toEqual({ ok: false, error: 'not-found' });
  });

  it('lets a player join and tells everyone', async () => {
    const host = await connectClient();
    const initialState = waitForEvent<RoomView>(host, 'room:state');
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');
    await initialState;

    const guest = await connectClient();
    const hostNextState = waitForEvent<RoomView>(host, 'room:state');
    const guestState = waitForEvent<RoomView>(guest, 'room:state');
    const joined = await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: null,
    });
    expect(joined.ok).toBe(true);

    const [hostView, guestView] = await Promise.all([hostNextState, guestState]);
    expect(hostView.players.map((p) => p.pseudo)).toEqual(['Host', 'Anna']);
    expect(guestView.you).toEqual(expect.objectContaining({ pseudo: 'Anna', isHost: false }));
  });

  it('plays a question to the results', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');

    const guest = await connectClient();
    await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: null,
    });

    const guestQuestionState = waitForEvent<RoomView>(guest, 'room:state');
    const startRes = await host.emitWithAck('game:start');
    expect(startRes).toEqual({ ok: true });
    await guestQuestionState;

    const guestAfterHostAnswer = waitForEvent<RoomView>(guest, 'room:state');
    const ans1 = await host.emitWithAck('game:answer', {
      game: 'syllable',
      answers: { tone: 'mid' },
    });
    expect(ans1).toEqual({ ok: true });
    await guestAfterHostAnswer;

    const hostResultsPromise = waitForEvent<RoomView>(host, 'room:state');
    const guestResultsPromise = waitForEvent<RoomView>(guest, 'room:state');
    const ans2 = await guest.emitWithAck('game:answer', {
      game: 'syllable',
      answers: { tone: 'low' },
    });
    expect(ans2).toEqual({ ok: true });

    const [hostView, guestView] = await Promise.all([hostResultsPromise, guestResultsPromise]);
    expect(hostView.phase.kind).toBe('results');
    expect(guestView.phase.kind).toBe('results');
  });

  it('lets a host who left come back as a player, and the new host end the game', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');
    const guest = await connectClient();
    await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: null,
    });
    const started = waitForEvent<RoomView>(guest, 'room:state');
    await host.emitWithAck('game:start');
    await started;

    const afterLeave = waitForEvent<RoomView>(guest, 'room:state');
    host.emit('room:leave');
    expect((await afterLeave).you.isHost).toBe(true);

    const back = await connectClient();
    const resumed = await back.emitWithAck('room:resume', {
      roomId: created.roomId,
      token: created.token,
    });
    expect(resumed).toEqual({ ok: true });
    expect(await back.emitWithAck('game:end')).toEqual({ ok: false, error: 'not-host' });

    const finished = waitForEvent<RoomView>(back, 'room:state');
    expect(await guest.emitWithAck('game:end')).toEqual({ ok: true });
    expect((await finished).phase.kind).toBe('finished');
  });

  it('closes the question at the deadline, even when the timer fires a little early', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');
    const guest = await connectClient();
    await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: null,
    });
    const started = waitForEvent<RoomView>(host, 'room:state');
    await host.emitWithAck('game:start');
    const { phase } = await started;
    if (phase.kind !== 'question') throw new Error('expected a question');

    // 20 ms before the deadline: the timer is set again for those 20 ms, and
    // fires while the clock of the room has not moved, as a timer firing early.
    now += phase.remainingMs - 20;
    await host.emitWithAck('game:answer', { game: 'syllable', answers: { tone: 'mid' } });
    await new Promise((resolve) => setTimeout(resolve, 60));

    const results = waitForEvent<RoomView>(host, 'room:state');
    now += 20;
    expect((await results).phase.kind).toBe('results');
  });

  it('lets a player come back with their token', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    if (!created.ok) throw new Error('expected room creation');

    const guest = await connectClient();
    const joined = await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: null,
    });
    if (!joined.ok) throw new Error('expected join');

    const disconnectState = waitForEvent<RoomView>(host, 'room:state');
    guest.disconnect();
    const afterDisconnect = await disconnectState;
    expect(afterDisconnect.players.find((p) => p.pseudo === 'Anna')).toBeUndefined();

    const guest2 = await connectClient();
    const resumeState = waitForEvent<RoomView>(host, 'room:state');
    const resumed = await guest2.emitWithAck('room:resume', {
      roomId: created.roomId,
      token: joined.token,
    });
    expect(resumed).toEqual({ ok: true });
    const afterResume = await resumeState;
    expect(afterResume.players.find((p) => p.pseudo === 'Anna')?.connected).toBe(true);
  });

  it('stops password guesses after 5 tries', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', {
      settings: { ...SETTINGS, password: 'secret' },
      pseudo: 'Host',
    });
    if (!created.ok) throw new Error('expected room creation');

    const guest = await connectClient();
    for (let i = 0; i < 5; i++) {
      const attempt = await guest.emitWithAck('room:join', {
        roomId: created.roomId,
        pseudo: 'Anna',
        password: 'wrong',
      });
      expect(attempt).toEqual({ ok: false, error: 'wrong-password' });
    }

    const sixth = await guest.emitWithAck('room:join', {
      roomId: created.roomId,
      pseudo: 'Anna',
      password: 'secret',
    });
    expect(sixth).toEqual({ ok: false, error: 'too-many-attempts' });
  });

  it('survives malformed messages', async () => {
    const client = await connectClient();
    // @ts-expect-error malformed payload
    expect(await client.emitWithAck('room:create', null)).toEqual({
      ok: false,
      error: 'invalid-settings',
    });
    // @ts-expect-error malformed payload
    expect(await client.emitWithAck('room:create', { settings: 42 })).toEqual({
      ok: false,
      error: 'invalid-settings',
    });
    // Emit without an ack callback
    (client as unknown as { emit: (ev: string, data: unknown) => void }).emit('room:join', null);

    expect(await client.emitWithAck('game:answer', {})).toEqual({
      ok: false,
      error: 'not-in-room',
    });

    const valid = await client.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    expect(valid.ok).toBe(true);
  });

  it('closes idle rooms', async () => {
    const host = await connectClient();
    const created = await host.emitWithAck('room:create', { settings: SETTINGS, pseudo: 'Host' });
    expect(created.ok).toBe(true);

    const closedPromise = waitForEvent<void>(host, 'room:closed');
    now += IDLE_ROOM_MS;
    server.sweep();
    await closedPromise;
  });
});
