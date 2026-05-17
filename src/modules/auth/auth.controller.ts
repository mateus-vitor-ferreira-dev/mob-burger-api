import type { Request, Response } from 'express';
import { loginService } from './auth.service.js';
import { success } from '../../utils/apiResponse.js';
import type { LoginInput } from './auth.schema.js';

export async function login(req: Request, res: Response) {
  const result = await loginService(req.body as LoginInput);
  return success(res, result);
}

export async function refreshToken(_req: Request, res: Response) {
  // TODO: implementar refresh token no Sprint 1
  return res.status(501).json({ error: { message: 'Not implemented yet.' } });
}
