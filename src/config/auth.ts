export const AUTH_CONFIG = {
  accessTokenSecret: process.env.JWT_SECRET ?? '',
  accessTokenExpiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as string,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? '',
  refreshTokenExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string,
  bcryptRounds: 12,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
} as const;
