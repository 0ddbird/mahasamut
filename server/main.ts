/**
 * Entry point for the unified Mahasamut server:
 * - POST /api/contact: contact email delivery
 * - POST /api/event: client usage events
 * - POST /api/report: tunnel to Sentry for the site's errors and question reports
 * - GET /metrics: Prometheus metrics endpoint
 * - /socket.io/*: multiplayer rooms
 *
 * Listens on the loopback interface only (127.0.0.1:3002 by default), behind Caddy.
 * Run in development with `npm run dev:server` or bundled by `npm run build:server`.
 * With `SENTRY_DSN` set, its own errors are reported to Sentry.
 */
import { createUnifiedServer } from './app';
import { readConfig } from './contact/config';
import { createServerMonitoring } from './monitoring';

const HOST = '127.0.0.1';
const log = (line: string) => console.log(line);

// First, so that the errors raised from here on, the server's start included, are reported.
// A configuration error below is only printed: the service exits without a report.
const monitoring = createServerMonitoring(process.env, undefined, { log });
if (monitoring.enabled) log('mahasamut: reporting errors to Sentry');

let config;
try {
  config = readConfig(process.env, log);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const port = Number(process.env.PORT ?? process.env.CONTACT_PORT ?? config.port);

const { httpServer } = createUnifiedServer({
  origin: config.origin,
  contactTo: config.to,
  contactTransport: config.transport,
  siteDsn: config.siteDsn,
  log,
  monitoring,
});

httpServer.listen(port, HOST, () => {
  log(`mahasamut: listening on ${HOST}:${port}`);
});
