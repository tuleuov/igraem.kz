import http from 'http';
import app from './app';
import { ENV } from './config/env';
import { CronService } from './services/cronService';
import { WebSocketService } from './services/websocketService';

const PORT = ENV.PORT || 3000;
const server = http.createServer(app);

// Initialize WebSocket server
WebSocketService.init(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Sports Ground Sharing Backend is running!`);
  console.log(`📱 Mobile Web App: http://localhost:5173 (or http://localhost:${PORT})`);
  console.log(`📊 Admin & Test Dashboard (TTLock Mock, Gateways, IIN): http://localhost:${PORT}/admin`);
  console.log(`💬 WebSocket Chat Server ready at ws://localhost:${PORT}/ws/play-proposals/:id/chat`);
  console.log(`=======================================================`);

  // Initialize TTLock Gateway Health Cron Monitoring & Automated No-Show Worker
  CronService.initGatewayMonitoring();
  CronService.initNoShowAutoCheck();

  // Сыграем: авто-переходы статусов заявок (каждые 5 мин)
  CronService.initPlayProposalStatusTransitions();
});
