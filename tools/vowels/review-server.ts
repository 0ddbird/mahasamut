/**
 * Local server for Thai vowel audio review.
 *
 *   npm run vowels:review
 */
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
import { apiKey, DEFAULT_VOICE, synthesize } from '../../scripts/google-tts.mjs';
import {
  applyDecision,
  getCurrentSoundInfo,
  publishAll,
  publishTake,
  readReview,
  writeReview,
} from './review-state';
import type { DecisionInput, VowelReview } from './review-state';
import { additionalTakes, readManifest, recordTakes, uniqueTakes } from './takes';
import { VOWELS_BY_ID, VOWELS_LIST } from './vowels-data';

const DEFAULT_PORT = 5182;
const MAX_BODY_BYTES = 64 * 1024;

export interface ReviewServerOptions {
  dataDir?: URL;
  publicDir?: URL;
  pageDir?: URL;
  port?: number;
}

export interface ReviewServer {
  url: string;
  close(): Promise<void>;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(response: ServerResponse, status: number, type: string, body: string | Buffer): void {
  response.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
  });
  response.end(body);
}

const sendJson = (response: ServerResponse, status: number, value: unknown) =>
  send(response, status, 'application/json; charset=utf-8', JSON.stringify(value));

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large.');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

export async function startVowelReviewServer({
  dataDir = new URL('../../data/vowels/', import.meta.url),
  publicDir = new URL('../../public/audio/vowels/', import.meta.url),
  pageDir = new URL('review-page/', import.meta.url),
  port = DEFAULT_PORT,
}: ReviewServerOptions = {}): Promise<ReviewServer> {
  const takesDir = new URL('takes/', dataDir);
  const reviewFile = new URL('review.json', dataDir);

  const PAGE_FILES: Record<string, { file: string; type: string }> = {
    '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
    '/review.js': { file: 'review.js', type: 'text/javascript; charset=utf-8' },
    '/review.css': { file: 'review.css', type: 'text/css; charset=utf-8' },
  };

  let queue: Promise<unknown> = Promise.resolve();
  const serialized = <T>(task: () => Promise<T> | T): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };

  function getState() {
    const manifest = readManifest(takesDir);
    const review = readReview(reviewFile);
    const currentSounds: Record<string, { exists: boolean; md5?: string }> = {};
    const takes: Record<string, ReturnType<typeof uniqueTakes>> = {};

    for (const v of VOWELS_LIST) {
      currentSounds[v.id] = getCurrentSoundInfo(publicDir, v.id);
      takes[v.id] = uniqueTakes(manifest[v.id] ?? []);
    }

    return {
      vowels: VOWELS_LIST,
      takes,
      currentSounds,
      review,
    };
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const { pathname } = url;

      if (request.method === 'GET') {
        if (pathname in PAGE_FILES) {
          const { file, type } = PAGE_FILES[pathname];
          const content = readFileSync(new URL(file, pageDir));
          return send(response, 200, type, content);
        }

        if (pathname === '/api/state') {
          return sendJson(response, 200, getState());
        }

        const matchCurrent = pathname.match(/^\/audio\/current\/([a-zA-Z0-9_]+)\.mp3$/);
        if (matchCurrent) {
          const id = matchCurrent[1];
          const file = new URL(`${id}.mp3`, publicDir);
          if (!existsSync(file)) {
            throw new HttpError(404, `No current sound file for ${id}.`);
          }
          return send(response, 200, 'audio/mpeg', readFileSync(file));
        }

        const matchTake = pathname.match(/^\/audio\/take\/([a-zA-Z0-9_]+)\/(\d+)\.mp3$/);
        if (matchTake) {
          const [, id, n] = matchTake;
          const manifest = readManifest(takesDir);
          const take = (manifest[id] ?? []).find((t) => t.n === Number(n));
          if (!take) throw new HttpError(404, `Take ${id}-${n} not found.`);
          const file = new URL(`${id}-${n}.mp3`, takesDir);
          if (!existsSync(file)) throw new HttpError(404, `Take file missing: ${file.pathname}`);
          return send(response, 200, 'audio/mpeg', readFileSync(file));
        }

        throw new HttpError(404, 'Not found.');
      }

      if (request.method === 'POST') {
        if (pathname === '/api/decision') {
          const body = (await readJsonBody(request)) as {
            id?: string;
            decision?: string;
            take?: number;
            note?: string;
          };
          if (!body.id || !body.decision) {
            throw new HttpError(400, 'Missing id or decision.');
          }

          const result = await serialized(() => {
            const current = readReview(reviewFile);
            const manifest = readManifest(takesDir);
            const updated = applyDecision(
              current,
              manifest,
              publicDir,
              body.id!,
              body as DecisionInput,
            );
            writeReview(reviewFile, updated);
            return updated[body.id!];
          });

          return sendJson(response, 200, { success: true, entry: result });
        }

        if (pathname === '/api/generate') {
          const body = (await readJsonBody(request)) as {
            id?: string;
            count?: number;
          };
          const count = body.count ?? 3;
          const key = await apiKey();
          if (!key) throw new HttpError(500, 'No Google TTS API key configured.');

          const targetVowels = body.id
            ? [VOWELS_BY_ID.get(body.id as never)].filter(Boolean)
            : [...VOWELS_LIST];

          if (targetVowels.length === 0) {
            throw new HttpError(400, `Unknown vowel id "${body.id}".`);
          }

          const result = await serialized(async () => {
            const manifest = readManifest(takesDir);
            const jobs = additionalTakes(targetVowels as never, manifest, count);
            const { done } = await recordTakes(jobs, {
              dir: takesDir,
              synthesize: (text) => synthesize(text, key, DEFAULT_VOICE),
              voice: DEFAULT_VOICE,
              retries: 4,
              delayMs: 1500,
            });
            return { done };
          });

          return sendJson(response, 200, { success: true, ...result, ...getState() });
        }

        if (pathname === '/api/publish') {
          const body = (await readJsonBody(request)) as {
            id?: string;
            take?: number;
            all?: boolean;
          };

          const result = await serialized(() => {
            const current = readReview(reviewFile);
            if (body.all) {
              const { published, skipped, updatedReview } = publishAll(
                current,
                takesDir,
                publicDir,
              );
              writeReview(reviewFile, updatedReview);
              return { published, skipped };
            }

            if (!body.id) throw new HttpError(400, 'Missing id.');
            const entry = current[body.id];
            const takeN = body.take ?? (entry?.decision === 'take' ? entry.take : undefined);
            if (takeN === undefined) {
              throw new HttpError(400, `No take selected to publish for "${body.id}".`);
            }

            const { md5 } = publishTake(publicDir, takesDir, body.id, takeN);
            const updatedReview: VowelReview = {
              ...current,
              [body.id]: {
                ...(entry ?? { decision: 'take', take: takeN }),
                decision: 'take',
                take: takeN,
                md5,
                note: entry?.note ?? '',
                decidedAt: entry?.decidedAt ?? new Date().toISOString(),
                publishedAt: new Date().toISOString(),
              },
            };
            writeReview(reviewFile, updatedReview);
            return { published: [body.id], md5 };
          });

          return sendJson(response, 200, { success: true, ...result, ...getState() });
        }

        throw new HttpError(404, 'Not found.');
      }

      throw new HttpError(405, 'Method not allowed.');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Internal error';
      sendJson(response, status, { error: message });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const url = `http://localhost:${address.port}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = await startVowelReviewServer();
    console.log(`\n🎧 Vowel review server running at: ${server.url}\n`);
    console.log('Press Ctrl+C to stop.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
