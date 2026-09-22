export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, isOperational = true, details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, details?: any): AppError {
    return new AppError(message, 400, true, details);
  }

  public static unauthorized(message = 'Необходима авторизация'): AppError {
    return new AppError(message, 401, true);
  }

  public static forbidden(message = 'Доступ запрещен'): AppError {
    return new AppError(message, 403, true);
  }

  public static notFound(message = 'Ресурс не найден'): AppError {
    return new AppError(message, 404, true);
  }

  public static conflict(message: string): AppError {
    return new AppError(message, 409, true);
  }

  public static internal(message = 'Внутренняя ошибка сервера'): AppError {
    return new AppError(message, 500, false);
  }
}
