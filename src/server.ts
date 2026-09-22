import app from './app';
import { ENV } from './config/env';
import { CronService } from './services/cronService';
import { logger } from './utils/logger';

const PORT = ENV.PORT || 3000;

// Process-level uncaught exception & unhandled promise rejection handlers
process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'CRITICAL: Uncaught Exception detected. Gracefully shutting down process.');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.fatal({ reason }, 'CRITICAL: Unhandled Rejection detected. Gracefully shutting down process.');
  process.exit(1);
});

const server = app.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 Sports Ground Sharing Backend is running on port ${PORT}!`);
  logger.info(`📱 Mobile Web App: http://localhost:5173 (or http://localhost:${PORT})`);
  logger.info(`📊 Admin & Test Dashboard: http://localhost:${PORT}/admin`);
  logger.info(`🏥 Health Check Endpoint: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);

  // Initialize TTLock Gateway Health Cron Monitoring & Automated No-Show Worker
  CronService.initGatewayMonitoring();
  CronService.initNoShowAutoCheck();
});

export default server;
