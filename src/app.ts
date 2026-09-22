import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import router from './routes';
import { ENV } from './config/env';
import { apiLimiter, authLimiter } from './middlewares/securityMiddleware';

const app = express();

// 1. Security HTTP Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for inline SPA static assets
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration
const allowedOrigins = ENV.CORS_ALLOWED_ORIGINS && ENV.CORS_ALLOWED_ORIGINS !== '*'
  ? ENV.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : '*';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins === '*' ||
      ENV.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Запрос отклонен политикой безопасности CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// 3. Body Parsing Memory Protection (Limit payload size to 1MB)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 4. Rate Limiting Protection (Brute-Force & DoS defense)
app.use('/api', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// Dedicated route for Interactive Web Test & Admin Dashboard
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
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[GlobalErrorHandler]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера',
  });
});

export default app;
