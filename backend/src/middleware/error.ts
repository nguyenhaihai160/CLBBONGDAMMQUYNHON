import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', details: error.flatten() });
  }

  const maybe = error as { statusCode?: number; message?: string };
  if (maybe.statusCode) {
    return res.status(maybe.statusCode).json({ message: maybe.message || 'Không thể xử lý yêu cầu' });
  }

  return res.status(500).json({ message: 'Lỗi hệ thống', hint: process.env.NODE_ENV === 'production' ? undefined : maybe.message });
}
