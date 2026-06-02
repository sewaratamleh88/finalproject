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

  io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    const userId = socket.handshake.auth?.userId;
    console.log('SOCKET CONNECTED:', userId);
    if (userId) {
      socket.join(String(userId));
    }
    socket.emit('server:hello', { message: 'connected' });
  });

  const port = env.PORT || 4000;

  
  server.listen(port, '0.0.0.0', () => {
    console.log(`API running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { io };