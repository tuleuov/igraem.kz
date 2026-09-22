import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RequestWithCorrelationId extends Request {
  id?: string;
}

export const loggerMiddleware = (req: RequestWithCorrelationId, res: Response, next: NextFunction): void => {
  const existingHeader = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = (Array.isArray(existingHeader) ? existingHeader[0] : existingHeader) || uuidv4();

  req.id = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      },
      `[HTTP] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};
