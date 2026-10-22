/**
 * Entry point for the multiplayer room server: listens on the loopback
 * interface only, behind the reverse proxy. Run in development with
 * `npm run dev:server` or bundled by `npm run build:rooms`.
 */
import { createRoomServer } from './app';

const host = '127.0.0.1';
const port = Number(process.env.ROOMS_PORT ?? process.env.PORT ?? 3001);
const { httpServer } = createRoomServer();

httpServer.listen(port, host, () => {
  console.log(`rooms: listening on ${host}:${port}`);
});
