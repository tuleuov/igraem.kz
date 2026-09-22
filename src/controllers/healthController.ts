import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export class HealthController {
  public static async checkHealth(req: Request, res: Response): Promise<Response> {
    const requestId = (req as any).id || (req.headers['x-request-id'] as string) || 'N/A';

    try {
      // Simple database readiness query
      await prisma.$queryRaw`SELECT 1`;

      return res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: 'connected',
        requestId,
      });
    } catch (error: any) {
      logger.error({ error: error.message, requestId }, '[HealthCheck] Database connection check failed');

      return res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        requestId,
      });
    }
  }
}
