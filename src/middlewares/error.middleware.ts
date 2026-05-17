import type { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError.js';

export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction): Response => {
  const appErr = err instanceof AppError ? err : null;
  const stdErr = err instanceof Error ? err : null;

  const status = appErr?.statusCode ?? 500;
  const code = appErr?.code ?? 'INTERNAL_ERROR';
  const isOperational = !!appErr;
  const message = isOperational || process.env.NODE_ENV !== 'production'
    ? (stdErr?.message ?? 'Internal server error')
    : 'Internal server error';

  console.error({
    event: 'request_error',
    message: stdErr?.message,
    code,
    status,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : stdErr?.stack,
  });

  return res.status(status).json({ error: { message, code, status } });
};
