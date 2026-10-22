/**
 * Entry point for the multiplayer room server.
 */
import { createRoomServer } from './app';

const port = Number(process.env.PORT ?? 3001);
const { httpServer } = createRoomServer();

httpServer.listen(port, () => {
  console.log(`Room server listening on port ${port}`);
});
