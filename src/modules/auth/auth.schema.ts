import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const customerRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
});

export const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const googleAuthSchema = z.object({
  accessToken: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
// accessToken → verificado via Google userinfo endpoint
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
