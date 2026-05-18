import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/prisma.js';
import { AUTH_CONFIG } from '../../config/auth.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';
import type {
  LoginInput,
  CustomerRegisterInput,
  CustomerLoginInput,
  GoogleAuthInput,
  RefreshTokenInput,
} from './auth.schema.js';

const googleClient = new OAuth2Client(AUTH_CONFIG.googleClientId);

type StaffTokenPayload = { sub: string; email: string; role: string; type: 'staff' };
type CustomerTokenPayload = { sub: string; email: string; type: 'customer' };

function generateTokens(payload: StaffTokenPayload | CustomerTokenPayload) {
  const accessToken = jwt.sign(payload, AUTH_CONFIG.accessTokenSecret, {
    expiresIn: AUTH_CONFIG.accessTokenExpiresIn,
  });
  const refreshToken = jwt.sign(payload, AUTH_CONFIG.refreshTokenSecret, {
    expiresIn: AUTH_CONFIG.refreshTokenExpiresIn,
  });
  return { accessToken, refreshToken };
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function loginService(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatch) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const payload: StaffTokenPayload = { sub: user.id, email: user.email, role: user.role, type: 'staff' };
  const tokens = generateTokens(payload);

  return { ...tokens, user: { id: user.id, email: user.email, role: user.role } };
}

// ─── Customer — email/senha ───────────────────────────────────────────────────

export async function customerRegisterService(data: CustomerRegisterInput) {
  const existing = await prisma.customer.findUnique({ where: { email: data.email } });

  if (existing) {
    throw new AppError(MSG.customer.emailAlreadyExists, HTTP.CONFLICT, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, AUTH_CONFIG.bcryptRounds);

  const customer = await prisma.customer.create({
    data: { name: data.name, email: data.email, phone: data.phone, passwordHash },
  });

  const payload: CustomerTokenPayload = { sub: customer.id, email: customer.email, type: 'customer' };
  const tokens = generateTokens(payload);

  return { ...tokens, customer: { id: customer.id, name: customer.name, email: customer.email } };
}

export async function customerLoginService(data: CustomerLoginInput) {
  const customer = await prisma.customer.findUnique({ where: { email: data.email } });

  if (!customer) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  if (!customer.passwordHash) {
    throw new AppError(MSG.customer.passwordNotSet, HTTP.UNAUTHORIZED, 'PASSWORD_NOT_SET');
  }

  const passwordMatch = await bcrypt.compare(data.password, customer.passwordHash);

  if (!passwordMatch) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const payload: CustomerTokenPayload = { sub: customer.id, email: customer.email, type: 'customer' };
  const tokens = generateTokens(payload);

  return { ...tokens, customer: { id: customer.id, name: customer.name, email: customer.email } };
}

// ─── Customer — Google OAuth ──────────────────────────────────────────────────

export async function googleAuthService(data: GoogleAuthInput) {
  const ticket = await googleClient.verifyIdToken({
    idToken: data.idToken,
    audience: AUTH_CONFIG.googleClientId,
  }).catch(() => {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_GOOGLE_TOKEN');
  });

  const googlePayload = ticket.getPayload();

  if (!googlePayload?.email) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_GOOGLE_TOKEN');
  }

  const { sub: googleId, email, name } = googlePayload;

  let customer = await prisma.customer.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (customer) {
    if (!customer.googleId) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { googleId },
      });
    }
  } else {
    customer = await prisma.customer.create({
      data: { name: name ?? email, email, googleId },
    });
  }

  const payload: CustomerTokenPayload = { sub: customer.id, email: customer.email, type: 'customer' };
  const tokens = generateTokens(payload);

  return { ...tokens, customer: { id: customer.id, name: customer.name, email: customer.email } };
}

// ─── Refresh token ────────────────────────────────────────────────────────────

export async function refreshTokenService(data: RefreshTokenInput) {
  let decoded: StaffTokenPayload | CustomerTokenPayload;

  try {
    decoded = jwt.verify(data.refreshToken, AUTH_CONFIG.refreshTokenSecret) as
      | StaffTokenPayload
      | CustomerTokenPayload;
  } catch {
    throw new AppError(MSG.auth.invalidRefreshToken, HTTP.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');
  }

  if (decoded.type === 'staff') {
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) throw new AppError(MSG.auth.invalidRefreshToken, HTTP.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');

    const payload: StaffTokenPayload = { sub: user.id, email: user.email, role: user.role, type: 'staff' };
    return generateTokens(payload);
  }

  const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
  if (!customer) throw new AppError(MSG.auth.invalidRefreshToken, HTTP.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');

  const payload: CustomerTokenPayload = { sub: customer.id, email: customer.email, type: 'customer' };
  return generateTokens(payload);
}
