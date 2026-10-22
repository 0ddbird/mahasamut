/**
 * Starts the contact service: reads the configuration, wires the handler to
 * its collaborators and listens on the loopback interface only, behind the
 * reverse proxy. Run by Node as it is (`npm run dev:server`) or bundled by
 * `npm run build:server`.
 */
import { readConfig } from './config.ts';
import { deliver } from './deliver.ts';
import { createContactHandler } from './handler.ts';
import { startServer } from './http.ts';
import { createLimits } from './limits.ts';

const HOST = '127.0.0.1';
const ATTEMPT_MS = 3000;

const log = (line: string) => console.log(line);

let config;
try {
  config = readConfig(process.env, log);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const handle = createContactHandler({
  origin: config.origin,
  to: config.to,
  limits: createLimits(Date.now),
  send: (mail) =>
    deliver(mail, {
      transport: config.transport,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      attemptMs: ATTEMPT_MS,
    }),
  log,
});

await startServer(handle, { host: HOST, port: config.port, log });
log(`contact: listening on ${HOST}:${config.port}`);
