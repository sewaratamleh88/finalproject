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
    console.log('User connected:', socket.id);
    socket.emit('server:hello', { message: 'connected' });
  });

  // fallback for Render PORT
  const port = env.PORT || 4000;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve());
  });

  // optional small fix (log)
  console.log(`API running on port ${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { io };
