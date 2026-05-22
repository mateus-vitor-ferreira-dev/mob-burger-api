import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_GOOGLE_TOKEN');
  }

  const data = (await res.json()) as GoogleUserInfo;

  if (!data.email) {
    throw new AppError(MSG.auth.invalidCredentials, HTTP.UNAUTHORIZED, 'INVALID_GOOGLE_TOKEN');
  }

  return data;
}

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

  const payload: StaffTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'staff',
  };
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

  const payload: CustomerTokenPayload = {
    sub: customer.id,
    email: customer.email,
    type: 'customer',
  };
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

  const payload: CustomerTokenPayload = {
    sub: customer.id,
    email: customer.email,
    type: 'customer',
  };
  const tokens = generateTokens(payload);

  return { ...tokens, customer: { id: customer.id, name: customer.name, email: customer.email } };
}

// ─── Customer — Google OAuth ──────────────────────────────────────────────────

export async function googleAuthService(data: GoogleAuthInput) {
  const { sub: googleId, email, name } = await getGoogleUserInfo(data.accessToken);

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

  const payload: CustomerTokenPayload = {
    sub: customer.id,
    email: customer.email,
    type: 'customer',
  };
  const tokens = generateTokens(payload);

  return { ...tokens, customer: { id: customer.id, name: customer.name, email: customer.email } };
}

// ─── Customer — me ───────────────────────────────────────────────────────────

export async function getMeService(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true, phone: true, googleId: true },
  });
  if (!customer) {
    throw new AppError('Cliente não encontrado', HTTP.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }
  return { customer: { ...customer, hasPassword: !!customer.googleId === false } };
}

export async function updateMeService(customerId: string, data: { name?: string; phone?: string }) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { ...(data.name && { name: data.name }), ...(data.phone !== undefined && { phone: data.phone }) },
    select: { id: true, name: true, email: true, phone: true },
  });
  return { customer };
}

export async function changePasswordService(customerId: string, currentPassword: string, newPassword: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError('Cliente não encontrado', HTTP.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }
  if (!customer.passwordHash) {
    throw new AppError('Conta vinculada ao Google não possui senha', HTTP.BAD_REQUEST, 'NO_PASSWORD');
  }
  const match = await bcrypt.compare(currentPassword, customer.passwordHash);
  if (!match) {
    throw new AppError('Senha atual incorreta', HTTP.UNAUTHORIZED, 'WRONG_PASSWORD');
  }
  const newHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);
  await prisma.customer.update({ where: { id: customerId }, data: { passwordHash: newHash } });
  return { message: 'Senha alterada com sucesso' };
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
    if (!user)
      throw new AppError(MSG.auth.invalidRefreshToken, HTTP.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');

    const payload: StaffTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'staff',
    };
    return generateTokens(payload);
  }

  const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
  if (!customer)
    throw new AppError(MSG.auth.invalidRefreshToken, HTTP.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');

  const payload: CustomerTokenPayload = {
    sub: customer.id,
    email: customer.email,
    type: 'customer',
  };
  return generateTokens(payload);
}
