/**
 * The HTTP layer of the contact service: it turns a request into a
 * ContactRequest for the handler and the handler's answer into JSON. It does
 * not decide anything about the message itself. Node loads this file as it is,
 * by stripping its types: no enums, no namespaces, no parameter properties.
 */
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { ContactReply } from '../../src/contact/rules.ts';
import type { ContactRequest, ContactResponse } from './handler.ts';

/** The most a request body may weigh; a contact message is far below it. */
export const MAX_BODY_BYTES = 16 * 1024;

const ENDPOINT = '/api/contact';
const REQUEST_TIMEOUT_MS = 10_000;

/** Answers `status` with `reply` as JSON. */
function respond(res: ServerResponse, status: number, reply: ContactReply): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(reply));
}

/** Answers 413 and closes the connection once answered; what is still coming is dropped. */
function refuseTooLarge(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Connection', 'close');
  respond(res, 413, { result: 'refused' });
  // Read and thrown away, so the answer is not cut short by a reset; the
  // request timeout bounds a sender that never stops.
  req.resume();
}

/** The visitor's address: the proxy's `X-Real-IP`, else the other end of the socket. */
function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-real-ip'];
  const value = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.trim();
  return value || req.socket.remoteAddress || 'unknown';
}

/**
 * Reads the body as text, or answers `undefined` when it grew past the cap
 * (the 413 is then already sent) or the connection broke.
 */
function readBody(req: IncomingMessage, res: ServerResponse): Promise<string | undefined> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      if (size > MAX_BODY_BYTES) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0;
        refuseTooLarge(req, res);
        resolve(undefined);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(undefined));
    req.on('close', () => resolve(undefined));
  });
}

/**
 * Starts the server on `host:port` (port 0 picks a free one) and resolves once
 * it listens. Only `/api/contact` is served. A handler that throws or rejects
 * is answered 500 and logged as `contact: error`, with nothing of the error:
 * it could carry the visitor's message. The process keeps serving.
 */
export function startServer(
  handle: (request: ContactRequest) => Promise<ContactResponse>,
  options: { host: string; port: number; log: (line: string) => void },
): Promise<Server> {
  const { host, port, log } = options;
  const server = createServer(
    {
      requestTimeout: REQUEST_TIMEOUT_MS,
      // Node only checks for timeouts every 30 s by default: 10 s must mean 10 s.
      connectionsCheckingInterval: 1000,
    },
    async (req, res) => {
      try {
        const { pathname } = new URL(req.url ?? '/', 'http://localhost');
        if (pathname !== ENDPOINT) {
          respond(res, 404, { result: 'refused' });
          req.resume();
          return;
        }
        if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
          refuseTooLarge(req, res);
          return;
        }
        const body = await readBody(req, res);
        if (body === undefined) return;
        const answer = await handle({
          method: req.method ?? '',
          contentType: req.headers['content-type'],
          origin: req.headers.origin,
          ip: clientIp(req),
          body,
        });
        respond(res, answer.status, answer.reply);
      } catch {
        log('contact: error');
        if (!res.headersSent) respond(res, 500, { result: 'failed' });
      }
    },
  );

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}
