/**
 * Creates the unified HTTP + Socket.IO server:
 * - POST /api/contact: contact email submission via Resend/console
 * - POST /api/event: anonymous client usage metrics
 * - POST /api/report: the tunnel that forwards the site's Sentry envelopes
 * - GET /metrics: Prometheus exposition endpoint (local loopback only)
 * - /socket.io/*: multiplayer rooms and gameplay
 */
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import { Server } from 'socket.io';
import { deliver } from './contact/deliver';
import { createContactHandler } from './contact/handler';
import { createLimits } from './contact/limits';
import { consoleTransport } from './contact/transports';
import type { Transport } from './contact/transports';
import { MAX_MESSAGE_BYTES, SWEEP_INTERVAL_MS } from './limits';
import { createEventHandler, MAX_EVENT_BODY_BYTES } from './metrics/eventHandler';
import { MetricsStore } from './metrics/store';
import { noopMonitoring } from './monitoring';
import type { ServerMonitoring } from './monitoring';
import { RoomRegistry } from './registry';
import { createBudgets } from './report/budgets';
import type { ParsedDsn } from './report/envelope';
import { createReportTunnel, MAX_REPORT_BODY_BYTES } from './report/tunnel';
import { attachRooms } from './socket';
import type { RoomServer } from './socket';

export const MAX_CONTACT_BODY_BYTES = 16 * 1024;
const ATTEMPT_MS = 3000;
const SENTRY_TIMEOUT_MS = 5000;

export interface UnifiedServerOptions {
  now?: () => number;
  origin?: string;
  contactTo?: string;
  contactTransport?: Transport;
  store?: MetricsStore;
  log?: (line: string) => void;
  registry?: RoomRegistry;
  /** The DSN of the site's Sentry project. Without it the report tunnel answers 404. */
  siteDsn?: ParsedDsn | null;
  /** What the report tunnel reaches Sentry with. Tests pass a stand-in. */
  fetch?: typeof fetch;
  /** Where the server's own errors and failed contact sends are reported. Off by default. */
  monitoring?: ServerMonitoring;
}

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-real-ip'];
  const value = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.trim();
  return value || req.socket.remoteAddress || 'unknown';
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      if (size > maxBytes) return;
      size += chunk.length;
      if (size > maxBytes) {
        chunks.length = 0;
        req.resume();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
    req.on('close', () => resolve(null));
  });
}

export function createUnifiedServer(options: UnifiedServerOptions = {}): {
  httpServer: http.Server;
  io: RoomServer;
  registry: RoomRegistry;
  store: MetricsStore;
  sweep(): void;
  close(): Promise<void>;
} {
  const log = options.log ?? (() => {});
  const now = options.now ?? Date.now;
  const store = options.store ?? new MetricsStore();
  const registry = options.registry ?? new RoomRegistry();
  const monitoring = options.monitoring ?? noopMonitoring;

  const origin =
    options.origin ??
    process.env.CONTACT_ORIGIN ??
    (process.env.NODE_ENV === 'production' ? 'https://mahasamut.app' : 'http://localhost:5173');

  const contactTo = options.contactTo ?? process.env.CONTACT_TO ?? 'contact@mahasamut.app';
  const contactTransport = options.contactTransport ?? consoleTransport(log);

  const contactHandler = createContactHandler({
    origin,
    to: contactTo,
    limits: createLimits(now),
    send: (mail) =>
      deliver(mail, {
        transport: contactTransport,
        wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        attemptMs: ATTEMPT_MS,
      }),
    log,
    metrics: store,
    onSendFailed: (codes) => monitoring.contactSendFailed(codes, contactTransport.name),
  });

  const eventHandler = createEventHandler({
    store,
    origin,
    now,
  });

  const sentryFetch = options.fetch ?? fetch;
  const reportTunnel = createReportTunnel({
    siteDsn: options.siteDsn ?? null,
    origin,
    budgets: createBudgets(now),
    // Only the content type is set: nothing of the visitor's request is passed on.
    forward: async (url, body) => {
      const response = await sentryFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        body,
        signal: AbortSignal.timeout(SENTRY_TIMEOUT_MS),
      });
      // The answer is of no use, and an unread body would hold the connection.
      await response.body?.cancel();
      return response.status;
    },
    log,
  });

  const httpServer = http.createServer(
    {
      requestTimeout: 10_000,
      connectionsCheckingInterval: 1000,
    },
    async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = url.pathname;

      // Socket.IO paths are handled by the Socket.IO server attached to httpServer.
      if (pathname.startsWith('/socket.io/')) {
        return;
      }

      if (pathname === '/api/contact') {
        if (Number(req.headers['content-length']) > MAX_CONTACT_BODY_BYTES) {
          res.setHeader('Connection', 'close');
          res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ result: 'refused' }));
          req.resume();
          return;
        }

        const body = await readBody(req, MAX_CONTACT_BODY_BYTES);
        if (body === null) {
          res.setHeader('Connection', 'close');
          res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ result: 'refused' }));
          return;
        }

        try {
          const answer = await contactHandler({
            method: req.method ?? '',
            contentType: req.headers['content-type'],
            origin: req.headers.origin,
            ip: clientIp(req),
            body,
          });
          res.writeHead(answer.status, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(answer.reply));
        } catch (error) {
          log('contact: error');
          monitoring.captureError(error, { handler: 'contact' });
          store.recordContactOutcome('error');
          if (!res.headersSent) {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            });
            res.end(JSON.stringify({ result: 'failed' }));
          }
        }
        return;
      }

      if (pathname === '/api/event') {
        if (Number(req.headers['content-length']) > MAX_EVENT_BODY_BYTES) {
          res.writeHead(413, { 'Cache-Control': 'no-store' });
          res.end();
          req.resume();
          return;
        }

        const body = await readBody(req, MAX_EVENT_BODY_BYTES);
        if (body === null) {
          res.writeHead(413, { 'Cache-Control': 'no-store' });
          res.end();
          return;
        }

        try {
          const answer = eventHandler({
            method: req.method ?? '',
            contentType: req.headers['content-type'],
            origin: req.headers.origin,
            userAgent: req.headers['user-agent'],
            ip: clientIp(req),
            body,
          });
          res.writeHead(answer.status, { 'Cache-Control': 'no-store' });
          res.end();
        } catch (error) {
          monitoring.captureError(error, { handler: 'event' });
          if (!res.headersSent) {
            res.writeHead(500, { 'Cache-Control': 'no-store' });
            res.end();
          }
        }
        return;
      }

      if (pathname === '/api/report') {
        if (Number(req.headers['content-length']) > MAX_REPORT_BODY_BYTES) {
          res.setHeader('Connection', 'close');
          res.writeHead(413, { 'Cache-Control': 'no-store' });
          res.end();
          req.resume();
          return;
        }

        const body = await readBody(req, MAX_REPORT_BODY_BYTES);
        if (body === null) {
          res.setHeader('Connection', 'close');
          res.writeHead(413, { 'Cache-Control': 'no-store' });
          res.end();
          return;
        }

        try {
          const answer = await reportTunnel({
            method: req.method ?? '',
            origin: req.headers.origin,
            ip: clientIp(req),
            body,
          });
          res.writeHead(answer.status, { 'Cache-Control': 'no-store' });
          res.end();
        } catch (error) {
          log('report: error');
          monitoring.captureError(error, { handler: 'report' });
          if (!res.headersSent) {
            res.writeHead(500, { 'Cache-Control': 'no-store' });
            res.end();
          }
        }
        return;
      }

      if (pathname === '/metrics') {
        if (req.method !== 'GET') {
          res.writeHead(405, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end('Method Not Allowed');
          return;
        }

        try {
          const counts = registry.counts();
          const text = store.formatPrometheus({
            activeRooms: counts,
            connectedPlayers: counts.connectedPlayers,
          });
          res.writeHead(200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end(text);
        } catch (error) {
          monitoring.captureError(error, { handler: 'metrics' });
          if (!res.headersSent) {
            res.writeHead(500, {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            });
            res.end('Internal Server Error');
          }
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    },
  );

  const io: RoomServer = new Server(httpServer, {
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
  });

  const rooms = attachRooms(io, registry, {
    now,
    metrics: store,
    onError: (error, event) => monitoring.captureError(error, { handler: event }),
  });
  const sweepTimer = setInterval(() => rooms.sweep(), SWEEP_INTERVAL_MS);

  async function close(): Promise<void> {
    clearInterval(sweepTimer);
    rooms.close();
    await new Promise<void>((resolve) => {
      void io.close(() => resolve());
    });
    if (httpServer.listening) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
    store.close();
  }

  return {
    httpServer,
    io,
    registry,
    store,
    sweep: rooms.sweep,
    close,
  };
}

export const createRoomServer = createUnifiedServer;
