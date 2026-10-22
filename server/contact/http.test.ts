import { request as httpRequest } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContactRequest, ContactResponse } from './handler.ts';
import { MAX_BODY_BYTES, startServer } from './http.ts';

const BODY = JSON.stringify({ email: 'a@b.co', subject: 'Hello', message: 'A question.' });
const SENT: ContactResponse = { status: 200, reply: { result: 'sent' } };

interface Answer {
  status: number;
  json: unknown;
}

/**
 * POSTs `chunks` to the server on a raw connection, so the headers are ours
 * alone (no Content-Length unless given: the body is then chunked). Answers as
 * soon as the response is in.
 */
function rawPost(
  port: number,
  options: { path?: string; headers?: Record<string, string>; chunks?: string[] },
): Promise<Answer> {
  const { path = '/api/contact', headers = {}, chunks = [] } = options;
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, path, method: 'POST', headers, agent: false },
      (res) => {
        const received: Buffer[] = [];
        res.on('data', (chunk: Buffer) => received.push(chunk));
        res.on('end', () => {
          req.destroy();
          resolve({
            status: res.statusCode ?? 0,
            json: JSON.parse(Buffer.concat(received).toString('utf8')),
          });
        });
      },
    );
    // The server may close on us once it has answered: only the answer counts.
    req.on('error', () => {});
    req.on('close', () => reject(new Error('closed without an answer')));
    req.flushHeaders();
    // With no chunks the request stays open, as if the declared body were on its way.
    if (chunks.length > 0) {
      for (const chunk of chunks) req.write(chunk);
      req.end();
    }
  });
}

describe('startServer', () => {
  let server: Server | undefined;
  let log: string[] = [];

  afterEach(async () => {
    if (!server) return;
    const closed = new Promise((resolve) => server?.close(resolve));
    server.closeAllConnections();
    await closed;
    server = undefined;
  });

  async function start(
    handle: (request: ContactRequest) => Promise<ContactResponse>,
  ): Promise<string> {
    log = [];
    server = await startServer(handle, {
      host: '127.0.0.1',
      port: 0,
      log: (line) => log.push(line),
    });
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  function portOf(url: string): number {
    return Number(new URL(url).port);
  }

  it('passes a POST to the handler with its IP from X-Real-IP', async () => {
    const handle = vi.fn(async (_request: ContactRequest) => SENT);
    const url = await start(handle);

    const response = await fetch(`${url}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'X-Real-IP': '203.0.113.7',
      },
      body: BODY,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ result: 'sent' });
    expect(handle).toHaveBeenCalledExactlyOnceWith({
      method: 'POST',
      contentType: 'application/json',
      origin: 'http://localhost:5173',
      ip: '203.0.113.7',
      body: BODY,
    });
  });

  it('falls back to the socket address', async () => {
    const handle = vi.fn(async (_request: ContactRequest) => SENT);
    const url = await start(handle);

    await fetch(`${url}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: BODY,
    });

    expect(handle.mock.calls[0][0].ip).toBe('127.0.0.1');
    expect(handle.mock.calls[0][0].origin).toBeUndefined();
  });

  it('relays the status and the reply of the handler', async () => {
    const url = await start(async () => ({
      status: 429,
      reply: { result: 'limited', scope: 'ip' },
    }));

    const response = await fetch(`${url}/api/contact`, { method: 'POST', body: BODY });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ result: 'limited', scope: 'ip' });
  });

  it('accepts a body of exactly 16 KB', async () => {
    const handle = vi.fn(async (_request: ContactRequest) => SENT);
    const url = await start(handle);
    const body = 'x'.repeat(MAX_BODY_BYTES);

    const answer = await rawPost(portOf(url), { chunks: [body.slice(0, 5000), body.slice(5000)] });

    expect(answer.status).toBe(200);
    expect(handle.mock.calls[0][0].body).toBe(body);
  });

  it('refuses a body over 16 KB without calling the handler', async () => {
    const handle = vi.fn(async (_request: ContactRequest) => SENT);
    const url = await start(handle);
    const port = portOf(url);

    // Declared too large: refused before a single byte of the body is sent.
    const declared = await rawPost(port, { headers: { 'Content-Length': '1000000' } });
    expect(declared).toEqual({ status: 413, json: { result: 'refused' } });

    // Chunked, with no declared length: refused as soon as it grows past the cap.
    const chunk = 'x'.repeat(MAX_BODY_BYTES / 2 + 1);
    const chunked = await rawPost(port, { chunks: [chunk, chunk] });
    expect(chunked).toEqual({ status: 413, json: { result: 'refused' } });

    expect(handle).not.toHaveBeenCalled();
  });

  it('answers 404 outside /api/contact', async () => {
    const handle = vi.fn(async (_request: ContactRequest) => SENT);
    const url = await start(handle);

    for (const path of ['/', '/api', '/api/contact/extra', '/other']) {
      const response = await fetch(`${url}${path}`, { method: 'POST', body: BODY });
      expect(response.status, path).toBe(404);
      expect(await response.json()).toEqual({ result: 'refused' });
    }

    expect(handle).not.toHaveBeenCalled();
  });

  it('answers 500 when the handler fails, and keeps serving', async () => {
    const handle = vi
      .fn<(request: ContactRequest) => Promise<ContactResponse>>()
      .mockRejectedValueOnce(new Error('visitor@example.org said something private'))
      .mockResolvedValue(SENT);
    const url = await start(handle);
    const post = () => fetch(`${url}/api/contact`, { method: 'POST', body: BODY });

    const failed = await post();
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({ result: 'failed' });
    expect(log).toEqual(['contact: error']);

    const next = await post();
    expect(next.status).toBe(200);
    expect(await next.json()).toEqual({ result: 'sent' });
  });
});
