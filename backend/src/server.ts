import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { initSocket } from './socket.js';

const server = http.createServer(app);
initSocket(server, env.frontendUrl);

server.listen(env.port, '0.0.0.0', () => {
  console.log(`App đang chạy tại http://0.0.0.0:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
});
