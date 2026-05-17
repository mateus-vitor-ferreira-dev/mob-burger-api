import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { AUTH_CONFIG } from '../../config/auth.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';
import type { LoginInput } from './auth.schema.js';

export async function loginService(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatch) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const payload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, AUTH_CONFIG.accessTokenSecret, {
    expiresIn: AUTH_CONFIG.accessTokenExpiresIn,
  });

  const refreshToken = jwt.sign(payload, AUTH_CONFIG.refreshTokenSecret, {
    expiresIn: AUTH_CONFIG.refreshTokenExpiresIn,
  });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}
