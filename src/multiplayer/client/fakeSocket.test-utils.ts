import type { RoomSocket } from './socket';

type Listener = (...args: unknown[]) => void;

export function createFakeSocket(): {
  socket: RoomSocket;
  replyTo: (event: string, handler: (payload: unknown) => unknown) => void;
  push: (event: string, payload?: unknown) => void;
  emitted: { event: string; args: unknown[] }[];
  connectNow: () => void;
  dropConnection: () => void;
} {
  const listeners = new Map<string, Set<Listener>>();
  const handlers = new Map<string, (payload: unknown) => unknown>();
  const emitted: { event: string; args: unknown[] }[] = [];
  let connected = false;

  function on(event: string, fn: Listener) {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(fn);
    return fake;
  }

  function off(event: string, fn: Listener) {
    listeners.get(event)?.delete(fn);
    return fake;
  }

  function emit(event: string, ...args: unknown[]) {
    const last = args[args.length - 1];
    const hasAck = typeof last === 'function';
    const payloadArgs = hasAck ? args.slice(0, -1) : args;
    emitted.push({ event, args: payloadArgs });
    const handler = handlers.get(event);
    if (hasAck && handler) {
      const response = handler(payloadArgs[0]);
      (last as (res: unknown) => void)(response);
    }
    return fake;
  }

  function fire(event: string, payload?: unknown) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      fn(payload);
    }
  }

  const fake = {
    get connected() {
      return connected;
    },
    connect() {
      return fake;
    },
    disconnect() {
      connected = false;
      fire('disconnect');
      return fake;
    },
    on,
    off,
    emit,
  };

  return {
    socket: fake as unknown as RoomSocket,
    replyTo(event, handler) {
      handlers.set(event, handler);
    },
    push(event, payload) {
      fire(event, payload);
    },
    emitted,
    connectNow() {
      connected = true;
      fire('connect');
    },
    dropConnection() {
      connected = false;
      fire('disconnect');
    },
  };
}
