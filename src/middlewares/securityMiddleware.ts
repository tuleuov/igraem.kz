import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { ENV } from '../config/env';

/**
 * General API Rate Limiter (300 requests per 15 minutes per IP)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Превышен лимит запросов к API. Пожалуйста, повторите попытку позже.',
  },
});

/**
 * Strict Auth Rate Limiter to prevent Brute-Force & Credential Stuffing (15 requests per 15 minutes per IP)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Слишком много попыток входа/регистрации. Попробуйте через 15 минут.',
  },
});

/**
 * Generic Zod Request Validation Middleware
 */
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({
          success: false,
          message: `Ошибка валидации входящих данных: ${issues}`,
        });
      }
      return res.status(400).json({ success: false, message: 'Некорректный формат запроса' });
    }
  };
}

/**
 * Input Validation Schemas with Zod
 */
export const authRegisterSchema = z.object({
  iin: z.string().length(12, 'ИИН должен состоять из 12 цифр'),
  phone_number: z.string().optional(),
  phone: z.string().optional(),
  full_name: z.string().optional(),
  fullName: z.string().optional(),
  password: z.string().min(6, 'Пароль должен быть длиной не менее 6 символов'),
  confirmPassword: z.string().optional(),
}).passthrough();

export const authLoginSchema = z.object({
  phone_or_iin: z.string().optional(),
  phoneOrIin: z.string().optional(),
  password: z.string().min(1, 'Укажите пароль'),
}).passthrough();

export const createBookingSchema = z.object({
  ground_id: z.string().min(1, 'Укажите ID площадки'),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты должен быть YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Формат времени должен быть HH:mm'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Формат времени должен быть HH:mm'),
  total_price: z.number().optional(),
}).passthrough();
