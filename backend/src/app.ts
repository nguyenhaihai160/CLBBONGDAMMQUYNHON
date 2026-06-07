import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes } from './routes.js';
import { errorHandler } from './middleware/error.js';

export const app = express();

app.use(helmet());

// Cho phép web/app PWA truy cập backend bằng localhost hoặc IP LAN.
// Ví dụ: http://localhost:5173, http://192.168.1.20:5173.
// Khi deploy production nên thay bằng whitelist domain thật.
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/api', routes);

// Production/PWA mode: Express serves the built React app from the same origin as the API.
// This removes the common iPhone/Docker login issue caused by calling a separate backend port.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = process.env.FRONTEND_DIST_PATH || path.resolve(__dirname, '../../frontend/dist');

app.use(express.static(frontendDistPath, {
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use(errorHandler);
