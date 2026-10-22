import { request } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startReviewServer } from './review-server';
import type { Review, ReviewEntry } from './review-state';
import type { Take } from './takes';

type Running = Awaited<ReturnType<typeof startReviewServer>>;

const candidate = (text: string, id: string, level: 1 | 2) => ({
  text,
  id,
  level,
  source: level === 1 ? 'dictionary' : 'corpus',
  frequency: 10,
});

const take = (id: string, n: number, md5: string) => ({
  n,
  file: `${id}-${n}.mp3`,
  text: id,
  voice: 'v',
  md5,
  recordedAt: '2026-10-21T10:00:00.000Z',
});

interface State {
  candidates: { text: string }[];
  takes: Record<string, Take[]>;
  review: Review;
  orphans: string[];
  pageSize: number;
  firstPendingPage: number;
}

const getState = async (server: Running) =>
  (await (await fetch(`${server.url}/api/state`)).json()) as State;

const post = (server: Running, body: unknown, contentType = 'application/json') =>
  fetch(`${server.url}/api/decision`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('the review server', () => {
  let folder: string;
  let dataDir: URL;
  let pageDir: URL;
  let servers: Running[];

  const start = async () => {
    const server = await startReviewServer({ dataDir, port: 0, pageDir });
    servers.push(server);
    return server;
  };
  const savedReview = () =>
    JSON.parse(readFileSync(join(folder, 'data', 'review.json'), 'utf8')) as Review;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'review-server-'));
    const data = join(folder, 'data');
    mkdirSync(join(data, 'takes'), { recursive: true });
    mkdirSync(join(folder, 'page'));
    dataDir = pathToFileURL(`${data}/`);
    pageDir = pathToFileURL(`${join(folder, 'page')}/`);
    servers = [];

    writeFileSync(
      join(data, 'candidates.json'),
      JSON.stringify({
        generated: '2026-10-21',
        candidates: [
          candidate('กา', 'a', 1),
          candidate('ขา', 'b', 1),
          candidate('คา', 'c', 2),
          candidate('งา', 'd', 1),
        ],
      }),
    );
    writeFileSync(
      join(data, 'takes', 'manifest.json'),
      JSON.stringify({
        a: [take('a', 1, 'same'), take('a', 2, 'same'), take('a', 3, 'other')],
        b: [take('b', 1, 'b1')],
        c: [take('c', 1, 'c1')],
      }),
    );
    for (const file of ['a-1', 'a-2', 'a-3', 'b-1', 'c-1']) {
      writeFileSync(join(data, 'takes', `${file}.mp3`), `audio of ${file}`);
    }
    writeFileSync(join(folder, 'page', 'index.html'), '<h1>review</h1>');
    writeFileSync(join(folder, 'page', 'review.js'), 'console.log(1);');
    writeFileSync(join(folder, 'page', 'review.css'), 'body {}');
    // A file beside the takes that no request may reach.
    writeFileSync(join(data, 'review.json'), '{}\n');
  });

  afterEach(async () => {
    await Promise.all(servers.map((server) => server.close()));
    rmSync(folder, { recursive: true, force: true });
  });

  it('listens on 127.0.0.1 only', async () => {
    const server = await start();
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it('serves the page, its script and its style', async () => {
    const server = await start();
    const page = await fetch(`${server.url}/`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await page.text()).toBe('<h1>review</h1>');

    const script = await fetch(`${server.url}/review.js`);
    expect(script.headers.get('content-type')).toMatch(/javascript/);
    expect(await script.text()).toBe('console.log(1);');

    const style = await fetch(`${server.url}/review.css`);
    expect(style.headers.get('content-type')).toMatch(/^text\/css/);
  });

  it('answers 404 for a page file that is not there, and for any other path', async () => {
    rmSync(join(folder, 'page', 'review.css'));
    const server = await start();
    expect((await fetch(`${server.url}/review.css`)).status).toBe(404);
    expect((await fetch(`${server.url}/other`)).status).toBe(404);
    expect((await fetch(`${server.url}/candidates.json`)).status).toBe(404);
  });

  describe('GET /api/state', () => {
    it('lists the level 1 candidates only, with their unique takes', async () => {
      const server = await start();
      const state = await getState(server);

      expect(state.candidates.map((c: { text: string }) => c.text)).toEqual(['กา', 'ขา', 'งา']);
      expect(state.takes['กา'].map((t: { n: number }) => t.n)).toEqual([1, 3]);
      expect(state.takes['ขา'].map((t: { file: string }) => t.file)).toEqual(['b-1.mp3']);
      expect(state.takes['งา']).toEqual([]);
      expect(state.takes).not.toHaveProperty('คา');
      expect(state.pageSize).toBe(50);
    });

    it('brings the review, its orphans and the first page to do', async () => {
      writeFileSync(
        join(folder, 'data', 'review.json'),
        JSON.stringify({
          กา: { decision: 'remove', note: '', decidedAt: 'x' },
          ผี: { decision: 'none', note: 'gone', decidedAt: 'y' },
        }),
      );
      const server = await start();
      const state = await getState(server);

      expect(Object.keys(state.review)).toEqual(['กา', 'ผี']);
      expect(state.orphans).toEqual(['ผี']);
      expect(state.firstPendingPage).toBe(0);
    });

    it('starts from an empty review when review.json does not exist yet', async () => {
      rmSync(join(folder, 'data', 'review.json'));
      const server = await start();
      const state = await getState(server);
      expect(state.review).toEqual({});
      expect(state.orphans).toEqual([]);
    });

    it('sees takes recorded while it runs', async () => {
      const server = await start();
      writeFileSync(
        join(folder, 'data', 'takes', 'manifest.json'),
        JSON.stringify({ b: [take('b', 1, 'b1'), take('b', 2, 'b2')] }),
      );
      const state = await getState(server);
      expect(state.takes['ขา']).toHaveLength(2);
    });
  });

  describe('POST /api/decision', () => {
    it('answers the saved entry, writes review.json, and survives a restart', async () => {
      const first = await start();
      const response = await post(first, { text: 'กา', decision: 'take', take: 3, note: 'clear' });
      expect(response.status).toBe(200);
      const entry = (await response.json()) as ReviewEntry;
      expect(entry).toMatchObject({ decision: 'take', take: 3, md5: 'other', note: 'clear' });
      expect(typeof entry.decidedAt).toBe('string');
      expect(savedReview().กา).toEqual(entry);

      await first.close();
      const second = await start();
      const state = await getState(second);
      expect(state.review.กา).toEqual(entry);
      expect(state.firstPendingPage).toBe(0);
    });

    it('keeps the note of the previous decision when none is sent', async () => {
      const server = await start();
      await post(server, { text: 'กา', decision: 'none', note: 'unclear' });
      const response = await post(server, { text: 'กา', decision: 'take', take: 1 });
      expect(await response.json()).toMatchObject({ decision: 'take', take: 1, note: 'unclear' });
    });

    it('keeps both of two concurrent decisions', async () => {
      const server = await start();
      const responses = await Promise.all([
        post(server, { text: 'กา', decision: 'take', take: 1 }),
        post(server, { text: 'ขา', decision: 'remove' }),
      ]);
      expect(responses.map((r) => r.status)).toEqual([200, 200]);

      const review = savedReview();
      expect(review.กา).toMatchObject({ decision: 'take', take: 1 });
      expect(review.ขา).toMatchObject({ decision: 'remove' });
    });

    it('keeps every decision of a burst', async () => {
      const server = await start();
      const decisions = ['กา', 'ขา', 'งา'];
      await Promise.all(decisions.map((text) => post(server, { text, decision: 'none' })));
      expect(Object.keys(savedReview()).sort()).toEqual([...decisions].sort());
    });

    it('answers 400 with the message for an unknown word', async () => {
      const server = await start();
      const response = await post(server, { text: 'ผี', decision: 'none' });
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: string }).error).toMatch(/ผี/);
      expect(savedReview()).toEqual({});
    });

    it('answers 400 for a level 2 word', async () => {
      const server = await start();
      expect((await post(server, { text: 'คา', decision: 'none' })).status).toBe(400);
    });

    it('answers 400 for a take that does not exist', async () => {
      const server = await start();
      const response = await post(server, { text: 'กา', decision: 'take', take: 9 });
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: string }).error).toMatch(/take 9/);
      expect(savedReview()).toEqual({});
    });

    it.each([
      ['a body that is not JSON', 'not json'],
      ['a body that is not an object', '[1]'],
      ['no text', { decision: 'none' }],
      ['an unknown decision', { text: 'กา', decision: 'maybe' }],
      ['a take decision without a take number', { text: 'กา', decision: 'take' }],
      ['a take number that is not a whole number', { text: 'กา', decision: 'take', take: 1.5 }],
      ['a note that is not a string', { text: 'กา', decision: 'none', note: 4 }],
    ])('answers 400 for %s', async (_name, body) => {
      const server = await start();
      const response = await post(server, body);
      expect(response.status).toBe(400);
      expect(typeof ((await response.json()) as { error: string }).error).toBe('string');
    });

    it('refuses a body that is not declared as JSON, as a form from another site would send', async () => {
      const server = await start();
      const response = await post(server, { text: 'กา', decision: 'none' }, 'text/plain');
      expect(response.status).toBe(415);
      expect(savedReview()).toEqual({});
    });

    it('answers 405 to a GET', async () => {
      const server = await start();
      expect((await fetch(`${server.url}/api/decision`)).status).toBe(405);
    });
  });

  describe('GET /takes/<file>', () => {
    it('serves a take of the manifest as audio', async () => {
      const server = await start();
      const response = await fetch(`${server.url}/takes/a-2.mp3`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('audio/mpeg');
      expect(await response.text()).toBe('audio of a-2');
    });

    it('answers 404 for a file that is not in the manifest', async () => {
      writeFileSync(join(folder, 'data', 'takes', 'z-1.mp3'), 'stray');
      const server = await start();
      expect((await fetch(`${server.url}/takes/z-1.mp3`)).status).toBe(404);
      expect((await fetch(`${server.url}/takes/manifest.json`)).status).toBe(404);
    });

    it('answers 404 for a take of the manifest whose file is gone', async () => {
      rmSync(join(folder, 'data', 'takes', 'b-1.mp3'));
      const server = await start();
      expect((await fetch(`${server.url}/takes/b-1.mp3`)).status).toBe(404);
    });

    it('answers 404 for a path that climbs out of the folder', async () => {
      const server = await start();
      for (const path of [
        '/takes/../review.json',
        '/takes/%2e%2e/review.json',
        '/takes/..%2freview.json',
        '/takes/%2e%2e%2freview.json',
      ]) {
        const response = await fetch(`${server.url}${path}`);
        expect(response.status, path).toBe(404);
      }
    });

    it('does not follow a path through the manifest', async () => {
      // Even raw, with no client normalising it first.
      const server = await start();
      const { hostname, port } = new URL(server.url);
      const net = await import('node:net');
      const status = await new Promise<string>((resolve, reject) => {
        const socket = net.connect(Number(port), hostname, () => {
          socket.write(
            `GET /takes/../review.json HTTP/1.1\r\nHost: ${hostname}:${port}\r\nConnection: close\r\n\r\n`,
          );
        });
        let data = '';
        socket.on('data', (chunk) => (data += chunk));
        socket.on('end', () => resolve(data.split('\r\n')[0]));
        socket.on('error', reject);
      });
      expect(status).toContain('404');
    });
  });

  describe('answering its own address only', () => {
    /** A request with the headers given (fetch does not let a script choose its Host). */
    const send = (
      server: Running,
      method: 'GET' | 'POST',
      path: string,
      headers: Record<string, string>,
      body?: string,
    ) =>
      new Promise<{ status: number; body: string }>((resolve, reject) => {
        const { port } = new URL(server.url);
        const outgoing = request(
          { host: '127.0.0.1', port: Number(port), method, path, headers },
          (response) => {
            let data = '';
            response.on('data', (chunk) => (data += chunk));
            response.on('end', () => resolve({ status: response.statusCode ?? 0, body: data }));
          },
        );
        outgoing.on('error', reject);
        outgoing.end(body);
      });
    const json = { 'content-type': 'application/json' };
    const decision = JSON.stringify({ text: 'กา', decision: 'none' });

    it('answers 403 to a request whose Host is another name, as a rebound DNS name sends', async () => {
      const server = await start();
      for (const path of ['/api/state', '/', '/takes/a-1.mp3']) {
        const { status, body } = await send(server, 'GET', path, { host: 'evil.example' });
        expect(status, path).toBe(403);
        expect(typeof (JSON.parse(body) as { error: string }).error).toBe('string');
      }
      const port = new URL(server.url).port;
      const wrongPort = await send(server, 'GET', '/api/state', {
        host: `localhost:${Number(port) + 1}`,
      });
      expect(wrongPort.status).toBe(403);
    });

    it('answers 403 to a request without a Host', async () => {
      const server = await start();
      const { port } = new URL(server.url);
      const net = await import('node:net');
      // HTTP/1.0 allows a request with no Host header at all.
      const statusLine = await new Promise<string>((resolve, reject) => {
        const socket = net.connect(Number(port), '127.0.0.1', () => {
          socket.write('GET /api/state HTTP/1.0\r\n\r\n');
        });
        let data = '';
        socket.on('data', (chunk) => (data += chunk));
        socket.on('end', () => resolve(data.split('\r\n')[0]));
        socket.on('error', reject);
      });
      expect(statusLine).toContain('403');
    });

    it('answers a Host of 127.0.0.1 or localhost with the listening port', async () => {
      const server = await start();
      const port = new URL(server.url).port;
      for (const host of [`127.0.0.1:${port}`, `localhost:${port}`]) {
        expect((await send(server, 'GET', '/api/state', { host })).status, host).toBe(200);
      }
    });

    it('answers 403 to a POST from another origin, and writes nothing', async () => {
      const server = await start();
      const host = `127.0.0.1:${new URL(server.url).port}`;
      for (const origin of ['http://evil.example', 'http://127.0.0.1:1', 'null']) {
        const { status } = await send(
          server,
          'POST',
          '/api/decision',
          { ...json, host, origin },
          decision,
        );
        expect(status, origin).toBe(403);
      }
      expect(savedReview()).toEqual({});
    });

    it('accepts a POST from its own origin, or with no Origin', async () => {
      const server = await start();
      const port = new URL(server.url).port;
      const host = `127.0.0.1:${port}`;
      for (const origin of [`http://127.0.0.1:${port}`, `http://localhost:${port}`]) {
        const { status } = await send(
          server,
          'POST',
          '/api/decision',
          { ...json, host: `localhost:${port}`, origin },
          decision,
        );
        expect(status, origin).toBe(200);
      }
      expect(
        (await send(server, 'POST', '/api/decision', { ...json, host }, decision)).status,
      ).toBe(200);
    });
  });
});
