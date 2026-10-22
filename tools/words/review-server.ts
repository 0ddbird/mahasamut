/**
 * Command: the local server of the word review tool.
 *
 *   npm run words:review
 *
 * It serves the review page (tools/words/review-page/), the level 1 words with
 * their takes, and the takes' MP3s, and saves every decision at once in
 * data/words/review.json. It listens on 127.0.0.1 only: the tool is for one
 * person on one machine. It also answers only requests addressed to
 * 127.0.0.1 or localhost on its port, and decisions posted from its own page.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
import type { Candidate } from './candidates';
import {
  applyDecision,
  firstPendingPage,
  orphans,
  readReview,
  uniqueTakes,
  writeReview,
} from './review-state';
import type { Decision } from './review-state';
import { readManifest } from './takes';
import type { Take } from './takes';

/** The port of the command. */
const PORT = 5181;
/** Words per page of the review page. */
const PAGE_SIZE = 50;
/** A decision is a few bytes; anything larger is not one. */
const MAX_BODY_BYTES = 64 * 1024;

/** The files of the review page, by the path they are served at. */
const PAGE_FILES: Record<string, { file: string; type: string }> = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/review.js': { file: 'review.js', type: 'text/javascript; charset=utf-8' },
  '/review.css': { file: 'review.css', type: 'text/css; charset=utf-8' },
};

/** The request was wrong; `status` is what to answer. */
class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ReviewServerOptions {
  /** The data/words/ folder, with a trailing slash: candidates.json, review.json, takes/. */
  dataDir: URL;
  /** The port to listen on; 0 lets the system choose one. */
  port: number;
  /** The folder of the review page, with a trailing slash; by default tools/words/review-page/. */
  pageDir?: URL;
}

export interface ReviewServer {
  /** The address to open, such as `http://127.0.0.1:5181`. */
  url: string;
  /** Stops listening and drops the open connections; calling it again is harmless. */
  close(): Promise<void>;
}

/** What a POST to /api/decision must say, checked; the word and the take are checked later against the data. */
function parseDecisionRequest(body: unknown): {
  text: string;
  input: Decision & { note?: string };
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new HttpError(400, 'The body must be a JSON object.');
  const { text, decision, take, note } = body as Record<string, unknown>;

  if (typeof text !== 'string' || text === '') throw new HttpError(400, 'The word is missing.');
  if (note !== undefined && typeof note !== 'string')
    throw new HttpError(400, 'The note must be a string.');

  const withNote = note === undefined ? {} : { note };
  switch (decision) {
    case 'take':
      if (typeof take !== 'number' || !Number.isInteger(take))
        throw new HttpError(400, 'A take decision needs the number of the take.');
      return { text, input: { decision, take, ...withNote } };
    case 'none':
    case 'remove':
      return { text, input: { decision, ...withNote } };
    default:
      throw new HttpError(400, 'The decision must be "take", "none" or "remove".');
  }
}

/** The whole body of a request, parsed as JSON. */
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw new HttpError(415, 'The body must be sent as application/json.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'The body is too large.');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'The body is not valid JSON.');
  }
}

function send(response: ServerResponse, status: number, type: string, body: string | Buffer) {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

const sendJson = (response: ServerResponse, status: number, value: unknown) =>
  send(response, status, 'application/json; charset=utf-8', JSON.stringify(value));

/** A file's content, or undefined when it is not there. */
function readIfPresent(file: URL): Buffer | undefined {
  try {
    return readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Starts the review server over a data folder.
 *
 * The manifest and the review are read again at each request, so that takes
 * recorded or decisions made while it runs are seen; the candidates are
 * frozen and read once.
 */
export async function startReviewServer({
  dataDir,
  port,
  pageDir = new URL('review-page/', import.meta.url),
}: ReviewServerOptions): Promise<ReviewServer> {
  const takesDir = new URL('takes/', dataDir);
  const reviewFile = new URL('review.json', dataDir);
  const translationsContent = readIfPresent(new URL('translations.json', dataDir));
  const translations = translationsContent
    ? (JSON.parse(translationsContent.toString('utf8')) as Record<
        string,
        { en?: string; fr?: string }
      >)
    : {};
  const { candidates } = JSON.parse(readFileSync(new URL('candidates.json', dataDir), 'utf8')) as {
    candidates: Candidate[];
  };
  const level1 = candidates.filter((candidate) => candidate.level === 1);

  // Writes go one after the other, each reading the review the previous one saved.
  let queue: Promise<unknown> = Promise.resolve();
  const serialized = <T>(task: () => T): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };

  function state() {
    const manifest = readManifest(takesDir);
    const review = readReview(reviewFile);
    return {
      candidates: level1,
      takes: Object.fromEntries(
        level1.map(({ id, text }) => [text, uniqueTakes(manifest[id] ?? [])]),
      ),
      translations,
      review,
      orphans: orphans(review, level1),
      pageSize: PAGE_SIZE,
      firstPendingPage: firstPendingPage(level1, review, PAGE_SIZE),
    };
  }

  async function saveDecision(request: IncomingMessage) {
    const { text, input } = parseDecisionRequest(await readJsonBody(request));
    return serialized(() => {
      const current = readReview(reviewFile);
      const manifest = readManifest(takesDir);
      let review;
      try {
        review = applyDecision(current, level1, manifest, text, input, new Date());
      } catch (error) {
        throw new HttpError(400, (error as Error).message);
      }
      writeReview(reviewFile, review);
      return review[text];
    });
  }

  /** The MP3 of a take, only if the manifest lists that exact name. */
  function takeFile(path: string): Buffer | undefined {
    const name = /^\/takes\/([^/]+)$/.exec(path)?.[1];
    if (name === undefined) return undefined;
    const listed: Take | undefined = Object.values(readManifest(takesDir))
      .flat()
      .find(({ file }) => file === name);
    // The name used to read is the manifest's own, not the request's.
    return listed && readIfPresent(new URL(listed.file, takesDir));
  }

  async function route(request: IncomingMessage, response: ServerResponse) {
    const path = (request.url ?? '/').split('?')[0];
    const method = request.method ?? 'GET';

    // A web page that rebinds its own name to 127.0.0.1 is same-origin with this
    // server, so no preflight protects it: only our own address is answered.
    const { port: own } = server.address() as AddressInfo;
    const hosts = [`127.0.0.1:${own}`, `localhost:${own}`];
    if (!hosts.includes(request.headers.host ?? ''))
      throw new HttpError(403, 'This server answers only at its own address.');
    const { origin } = request.headers;
    if (
      method === 'POST' &&
      origin !== undefined &&
      !hosts.some((host) => origin === `http://${host}`)
    )
      throw new HttpError(403, 'This server takes decisions only from its own page.');

    if (path === '/api/decision') {
      if (method !== 'POST') throw new HttpError(405, 'Use POST.');
      return sendJson(response, 200, await saveDecision(request));
    }
    if (method !== 'GET') throw new HttpError(405, 'Use GET.');

    if (path === '/api/state') return sendJson(response, 200, state());
    if (path.startsWith('/takes/')) {
      const mp3 = takeFile(path);
      if (!mp3) throw new HttpError(404, 'No such take.');
      return send(response, 200, 'audio/mpeg', mp3);
    }
    const page = Object.hasOwn(PAGE_FILES, path) ? PAGE_FILES[path] : undefined;
    const content = page && readIfPresent(new URL(page.file, pageDir));
    if (!page || !content) throw new HttpError(404, 'Not found.');
    return send(response, 200, page.type, content);
  }

  const server = createServer((request, response) => {
    route(request, response).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      if (status === 500) console.error(error);
      if (!response.headersSent) sendJson(response, status, { error: message });
      else response.destroy();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  let closed: Promise<void> | undefined;
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => {
      closed ??= new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
      return closed;
    },
  };
}

// Run as a command, not when a test imports this file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { url } = await startReviewServer({
      dataDir: new URL('../../data/words/', import.meta.url),
      port: PORT,
    });
    console.log(`Word review: ${url}  (Ctrl+C to stop)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
