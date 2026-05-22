import type { Request, Response } from 'express';
import {
  loginService,
  customerRegisterService,
  customerLoginService,
  googleAuthService,
  refreshTokenService,
  getMeService,
  updateMeService,
  changePasswordService,
} from './auth.service.js';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import type {
  LoginInput,
  CustomerRegisterInput,
  CustomerLoginInput,
  GoogleAuthInput,
  RefreshTokenInput,
} from './auth.schema.js';

export async function login(req: Request, res: Response) {
  const result = await loginService(req.body as LoginInput);
  return success(res, result);
}

export async function customerRegister(req: Request, res: Response) {
  const result = await customerRegisterService(req.body as CustomerRegisterInput);
  return success(res, result, HTTP.CREATED);
}

export async function customerLogin(req: Request, res: Response) {
  const result = await customerLoginService(req.body as CustomerLoginInput);
  return success(res, result);
}

export async function googleAuth(req: Request, res: Response) {
  const result = await googleAuthService(req.body as GoogleAuthInput);
  return success(res, result);
}

export async function refreshToken(req: Request, res: Response) {
  const result = await refreshTokenService(req.body as RefreshTokenInput);
  return success(res, result);
}

export async function getMe(req: Request, res: Response) {
  const result = await getMeService(req.user!.id);
  return success(res, result);
}

export async function updateMe(req: Request, res: Response) {
  const result = await updateMeService(req.user!.id, req.body as { name?: string; phone?: string });
  return success(res, result);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const result = await changePasswordService(req.user!.id, currentPassword, newPassword);
  return success(res, result);
}
