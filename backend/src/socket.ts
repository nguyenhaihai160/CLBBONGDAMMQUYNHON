import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

export let io: Server | null = null;

export function initSocket(server: HttpServer, frontendUrl: string) {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { message: 'Realtime đã kết nối' });
  });

  return io;
}

export function emitRealtime(event: string, payload: unknown) {
  if (io) io.emit(event, payload);
}
