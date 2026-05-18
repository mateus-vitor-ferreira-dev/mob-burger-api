import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/auth.js', () => ({
  AUTH_CONFIG: {
    accessTokenSecret: 'test-secret',
    accessTokenExpiresIn: '7d',
    refreshTokenSecret: 'test-refresh',
    refreshTokenExpiresIn: '30d',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

import jwt from 'jsonwebtoken';
import { authMiddleware, requireAdmin, requireStaff, requireCustomer } from './auth.middleware.js';

const next = vi.fn() as unknown as NextFunction;
const res = {} as Response;

function makeReq(headers: Record<string, string> = {}, user?: object): Request {
  return { headers, user } as unknown as Request;
}

beforeEach(() => vi.clearAllMocks());

// ─── authMiddleware ───────────────────────────────────────────────────────────

describe('authMiddleware', () => {
  it('lança 401 sem header Authorization', () => {
    expect(() => authMiddleware(makeReq(), res, next))
      .toThrow(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));
  });

  it('lança 401 com header sem prefixo Bearer', () => {
    expect(() => authMiddleware(makeReq({ authorization: 'Token abc123' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));
  });

  it('popula req.user e chama next() com token válido', () => {
    const payload = { sub: 'u1', email: 'a@b.com', type: 'staff', role: 'ADMIN' };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    const req = makeReq({ authorization: 'Bearer valid_token' });
    authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com', type: 'staff', role: 'ADMIN' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('lança 401 quando token está expirado', () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('jwt expired'); });

    expect(() => authMiddleware(makeReq({ authorization: 'Bearer expired' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 401, code: 'TOKEN_EXPIRED' }));
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('chama next() para usuário ADMIN', () => {
    const req = makeReq({}, { role: 'ADMIN', type: 'staff' });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('lança 403 para ATTENDANT', () => {
    expect(() => requireAdmin(makeReq({}, { role: 'ATTENDANT', type: 'staff' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });

  it('lança 403 para cliente', () => {
    expect(() => requireAdmin(makeReq({}, { type: 'customer' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });
});

// ─── requireStaff ─────────────────────────────────────────────────────────────

describe('requireStaff', () => {
  it('chama next() para staff', () => {
    requireStaff(makeReq({}, { type: 'staff', role: 'ATTENDANT' }), res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('lança 403 para cliente', () => {
    expect(() => requireStaff(makeReq({}, { type: 'customer' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });
});

// ─── requireCustomer ─────────────────────────────────────────────────────────

describe('requireCustomer', () => {
  it('chama next() para cliente', () => {
    requireCustomer(makeReq({}, { type: 'customer' }), res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('lança 403 para staff', () => {
    expect(() => requireCustomer(makeReq({}, { type: 'staff', role: 'ADMIN' }), res, next))
      .toThrow(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });
});
