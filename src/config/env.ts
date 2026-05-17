const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FRONTEND_URL',
  'NODE_ENV',
] as const;

export function validateEnv(): void {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    console.warn('[WARN] REDIS_URL not set. Rate limiting will use in-memory store.');
  }

  const missingZapi = ['ZAPI_INSTANCE_ID', 'ZAPI_TOKEN', 'ZAPI_CLIENT_TOKEN'].filter(
    (v) => !process.env[v],
  );
  if (missingZapi.length > 0) {
    console.warn(`[WARN] WhatsApp not configured. Missing: ${missingZapi.join(', ')}`);
  }

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
