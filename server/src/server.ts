import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

let io: SocketIOServer;

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  // Socket.IO is required by the stack; we'll wire auth/events in a later step.
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log('User connected:', socket.id);
    socket.emit('server:hello', { message: 'connected' });
  });

  const port = env.PORT;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve());
  });
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

export { io };

