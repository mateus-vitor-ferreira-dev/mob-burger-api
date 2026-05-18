import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock('../../config/prisma.js', () => ({
  default: {
    user: { findUnique: vi.fn() },
    customer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../config/auth.js', () => ({
  AUTH_CONFIG: {
    accessTokenSecret: 'test-secret',
    accessTokenExpiresIn: '7d',
    refreshTokenSecret: 'test-refresh',
    refreshTokenExpiresIn: '30d',
    bcryptRounds: 10,
    googleClientId: 'test-google-id',
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$hashed_password'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock_token'),
    verify: vi.fn(),
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import prisma from '../../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  loginService,
  customerRegisterService,
  customerLoginService,
  googleAuthService,
  refreshTokenService,
} from './auth.service.js';

const mockUser = { id: 'u1', email: 'admin@test.com', passwordHash: '$hash', role: 'ADMIN' };
const mockCustomer = {
  id: 'c1',
  email: 'c@test.com',
  name: 'Teste',
  phone: '11999990000',
  passwordHash: '$hash',
  googleId: null,
};

beforeEach(() => vi.clearAllMocks());

// ─── loginService ────────────────────────────────────────────────────────────

describe('loginService', () => {
  it('retorna tokens e dados do usuário com credenciais válidas', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    const result = await loginService({ email: 'admin@test.com', password: 'senha123' });

    expect(result.accessToken).toBe('mock_token');
    expect(result.refreshToken).toBe('mock_token');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.email).toBe('admin@test.com');
  });

  it('lança 401 quando usuário não existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(loginService({ email: 'x@x.com', password: '123456' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('lança 401 quando senha está incorreta', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

    await expect(
      loginService({ email: 'admin@test.com', password: 'errada' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });
});

// ─── customerRegisterService ──────────────────────────────────────────────────

describe('customerRegisterService', () => {
  it('cria cliente e retorna tokens', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer as any);

    const result = await customerRegisterService({
      name: 'Teste',
      email: 'c@test.com',
      phone: '11999990000',
      password: 'senha123',
    });

    expect(result.accessToken).toBe('mock_token');
    expect(result.customer.email).toBe('c@test.com');
    expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
  });

  it('lança 409 quando e-mail já está cadastrado', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);

    await expect(
      customerRegisterService({
        name: 'Outro',
        email: 'c@test.com',
        phone: '11988887777',
        password: 'senha123',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' });
  });
});

// ─── customerLoginService ─────────────────────────────────────────────────────

describe('customerLoginService', () => {
  it('retorna tokens com credenciais válidas', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    const result = await customerLoginService({ email: 'c@test.com', password: 'senha123' });

    expect(result.accessToken).toBe('mock_token');
    expect(result.customer.name).toBe('Teste');
  });

  it('lança 401 quando cliente não existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    await expect(
      customerLoginService({ email: 'x@x.com', password: 'senha123' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('lança 401 quando conta é só Google (sem senha)', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...mockCustomer,
      passwordHash: null,
    } as any);

    await expect(
      customerLoginService({ email: 'c@test.com', password: 'senha123' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'PASSWORD_NOT_SET' });
  });

  it('lança 401 quando senha está incorreta', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

    await expect(
      customerLoginService({ email: 'c@test.com', password: 'errada' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });
});

// ─── googleAuthService ────────────────────────────────────────────────────────

describe('googleAuthService', () => {
  const googlePayload = { sub: 'google_123', email: 'google@test.com', name: 'Google User' };

  it('cria novo cliente no primeiro login via Google', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.create).mockResolvedValue({
      ...mockCustomer,
      email: 'google@test.com',
      googleId: 'google_123',
    } as any);

    const result = await googleAuthService({ idToken: 'valid_token' });

    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ googleId: 'google_123' }) }),
    );
    expect(result.accessToken).toBe('mock_token');
  });

  it('retorna tokens para cliente Google já existente', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      ...mockCustomer,
      googleId: 'google_123',
    } as any);

    const result = await googleAuthService({ idToken: 'valid_token' });

    expect(prisma.customer.create).not.toHaveBeenCalled();
    expect(result.accessToken).toBe('mock_token');
  });

  it('vincula googleId a cliente com mesmo e-mail', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      ...mockCustomer,
      googleId: null,
    } as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...mockCustomer,
      googleId: 'google_123',
    } as any);

    await googleAuthService({ idToken: 'valid_token' });

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { googleId: 'google_123' } }),
    );
  });

  it('lança 401 quando token do Google é inválido', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

    await expect(googleAuthService({ idToken: 'invalid' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GOOGLE_TOKEN',
    });
  });
});

// ─── refreshTokenService ──────────────────────────────────────────────────────

describe('refreshTokenService', () => {
  it('renova tokens para staff', async () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'u1',
      email: 'admin@test.com',
      role: 'ADMIN',
      type: 'staff',
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const result = await refreshTokenService({ refreshToken: 'valid_refresh' });

    expect(result.accessToken).toBe('mock_token');
  });

  it('renova tokens para cliente', async () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'c1',
      email: 'c@test.com',
      type: 'customer',
    } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);

    const result = await refreshTokenService({ refreshToken: 'valid_refresh' });

    expect(result.accessToken).toBe('mock_token');
  });

  it('lança 401 quando refresh token é inválido', async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(refreshTokenService({ refreshToken: 'bad_token' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('lança 401 quando usuário não existe mais no banco', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'u_deleted', type: 'staff' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(refreshTokenService({ refreshToken: 'orphan_token' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });
});
