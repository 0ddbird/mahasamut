import { parseClientEvent } from '../../src/site/events';
import { ipKey } from '../contact/limits';
import type { MetricsStore } from './store';

export const MAX_EVENT_BODY_BYTES = 1024;
export const EVENT_RATE_LIMIT_PER_MINUTE = 60;
export const BOT_USER_AGENT_REGEX =
  /bot|crawler|spider|headless|lighthouse|curl|wget|python|go-http-client/i;

export interface EventRequest {
  method: string;
  contentType: string | undefined;
  origin: string | undefined;
  userAgent: string | undefined;
  ip: string;
  body: string;
}

export interface EventResponse {
  status: number;
}

export interface EventHandlerDeps {
  store: MetricsStore;
  origin: string;
  now?: () => number;
}

export function createEventHandler(
  deps: EventHandlerDeps,
): (request: EventRequest) => EventResponse {
  const { store, origin, now = Date.now } = deps;
  const ipBuckets = new Map<string, number[]>();

  return (request: EventRequest): EventResponse => {
    if (request.method !== 'POST') {
      return { status: 405 };
    }
    if (!request.contentType?.startsWith('application/json')) {
      return { status: 415 };
    }
    if (request.origin !== origin) {
      return { status: 403 };
    }
    if (Buffer.byteLength(request.body, 'utf8') > MAX_EVENT_BODY_BYTES) {
      return { status: 413 };
    }

    // Bot detection: absent or matches known crawler/bot patterns -> drop silently
    if (!request.userAgent || BOT_USER_AGENT_REGEX.test(request.userAgent)) {
      return { status: 204 };
    }

    const currentTime = now();
    const windowStart = currentTime - 60_000;
    const key = ipKey(request.ip);

    let timestamps = ipBuckets.get(key);
    if (!timestamps) {
      timestamps = [];
      ipBuckets.set(key, timestamps);
    } else {
      timestamps = timestamps.filter((t) => t > windowStart);
      ipBuckets.set(key, timestamps);
    }

    if (timestamps.length >= EVENT_RATE_LIMIT_PER_MINUTE) {
      return { status: 204 };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(request.body);
    } catch {
      return { status: 400 };
    }

    const event = parseClientEvent(parsed);
    if (!event) {
      return { status: 400 };
    }

    timestamps.push(currentTime);
    store.recordClientEvent(event, currentTime);

    return { status: 204 };
  };
}
