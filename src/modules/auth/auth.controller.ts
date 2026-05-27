import type { Request, Response } from 'express';
import {
  loginService,
  customerRegisterService,
  customerLoginService,
  forgotPasswordService,
  resetPasswordService,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await getMeService((req as any).user!.id);
  return success(res, result);
}

export async function updateMe(req: Request, res: Response) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await updateMeService((req as any).user!.id, req.body as { name?: string; phone?: string });
  return success(res, result);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await changePasswordService((req as any).user!.id, currentPassword, newPassword);
  return success(res, result);
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  const token = await forgotPasswordService(email);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const resetUrl = token ? `${frontendUrl}/redefinir-senha?token=${token}` : null;
  // Sempre retorna 200 para não revelar se e-mail existe
  return success(res, { resetUrl });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  await resetPasswordService(token, newPassword);
  return success(res, { message: 'Senha redefinida com sucesso.' });
}
