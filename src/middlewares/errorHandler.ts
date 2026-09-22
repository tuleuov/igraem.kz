import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const requestId = (req as any).id || (req.headers['x-request-id'] as string) || 'N/A';
  const statusCode = err instanceof AppError ? err.statusCode : err.status || err.statusCode || 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  const isDev = process.env.NODE_ENV !== 'production';

  logger.error(
    {
      requestId,
      statusCode,
      isOperational,
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
        details: err.details,
      },
      url: req.originalUrl || req.url,
      method: req.method,
    },
    `[ErrorHandler] ${err.message || 'Unhandled error'}`
  );

  const responseMessage =
    !isOperational && statusCode === 500 && !isDev
      ? 'Внутренняя ошибка сервера'
      : err.message || 'Внутренняя ошибка сервера';

  res.status(statusCode).json({
    success: false,
    error: {
      message: responseMessage,
      statusCode,
      requestId,
      ...(err.details ? { details: err.details } : {}),
    },
  });
};
