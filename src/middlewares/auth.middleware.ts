import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/auth.js';
import AppError from '../utils/AppError.js';
import { MSG } from '../constants/messages/index.js';
import { HTTP } from '../constants/httpStatus.js';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'staff' | 'customer';
  role?: string;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(MSG.auth.unauthorized, HTTP.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, AUTH_CONFIG.accessTokenSecret) as JwtPayload;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { id: payload.sub, email: payload.email, type: payload.type, role: payload.role };
    next();
  } catch {
    throw new AppError(MSG.auth.tokenExpired, HTTP.UNAUTHORIZED, 'TOKEN_EXPIRED');
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((req as any).user?.role !== 'ADMIN') {
    throw new AppError(MSG.auth.forbidden, HTTP.FORBIDDEN, 'FORBIDDEN');
  }
  next();
};

export const requireStaff = (req: Request, _res: Response, next: NextFunction): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((req as any).user?.type !== 'staff') {
    throw new AppError(MSG.auth.forbidden, HTTP.FORBIDDEN, 'FORBIDDEN');
  }
  next();
};

export const requireCustomer = (req: Request, _res: Response, next: NextFunction): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((req as any).user?.type !== 'customer') {
    throw new AppError(MSG.auth.forbidden, HTTP.FORBIDDEN, 'FORBIDDEN');
  }
  next();
};
