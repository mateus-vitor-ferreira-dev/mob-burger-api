import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import AppError from '../utils/AppError.js';
import { HTTP } from '../constants/httpStatus.js';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        'Dados inválidos. Verifique os campos e tente novamente.',
        HTTP.BAD_REQUEST,
        'VALIDATION_ERROR',
      );
    }
    req.body = result.data;
    next();
  };
