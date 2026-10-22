/**
 * Entry point for the unified Mahasamut server:
 * - POST /api/contact: contact email delivery
 * - POST /api/event: client usage events
 * - GET /metrics: Prometheus metrics endpoint
 * - /socket.io/*: multiplayer rooms
 *
 * Listens on the loopback interface only (127.0.0.1:3002 by default), behind Caddy.
 * Run in development with `npm run dev:server` or bundled by `npm run build:server`.
 */
import { createUnifiedServer } from './app';
import { readConfig } from './contact/config';

const HOST = '127.0.0.1';
const log = (line: string) => console.log(line);

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
  log,
});

httpServer.listen(port, HOST, () => {
  log(`mahasamut: listening on ${HOST}:${port}`);
});
