import express from 'express';
import cors from 'cors';
import path from 'path';
import router from './routes';
import { loggerMiddleware } from './middlewares/loggerMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import { HealthController } from './controllers/healthController';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// Dedicated root healthcheck endpoint
app.get('/health', HealthController.checkHealth as any);

// Dedicated route for Interactive Web Test & Admin Dashboard (TTLock Mock toggle, Gateways, IIN Validator, Akimat Dashboard)
app.get(['/admin', '/dashboard', '/test-dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static React frontend files from client/dist (if built) or public
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/v1', router);

// SPA Fallback for non-API GET routes to serve React app
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

export default app;
