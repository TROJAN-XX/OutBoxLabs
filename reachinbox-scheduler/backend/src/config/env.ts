import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[CONFIG] Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  // Server
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Redis
  REDIS_URL: optionalEnv('REDIS_URL', 'redis://localhost:6379'),

  // Google OAuth
  GOOGLE_CLIENT_ID: optionalEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optionalEnv('GOOGLE_CLIENT_SECRET', ''),

  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '7d'),

  // Ethereal SMTP
  ETHEREAL_HOST: optionalEnv('ETHEREAL_HOST', 'smtp.ethereal.email'),
  ETHEREAL_PORT: parseInt(optionalEnv('ETHEREAL_PORT', '587'), 10),
  ETHEREAL_USER: optionalEnv('ETHEREAL_USER', ''),
  ETHEREAL_PASSWORD: optionalEnv('ETHEREAL_PASSWORD', ''),

  // Worker
  WORKER_CONCURRENCY: parseInt(optionalEnv('WORKER_CONCURRENCY', '5'), 10),

  // Rate Limiting
  MAX_EMAILS_PER_HOUR: parseInt(optionalEnv('MAX_EMAILS_PER_HOUR', '100'), 10),
  MIN_EMAIL_DELAY_MS: parseInt(optionalEnv('MIN_EMAIL_DELAY_MS', '2000'), 10),

  // Retry
  EMAIL_RETRY_ATTEMPTS: parseInt(optionalEnv('EMAIL_RETRY_ATTEMPTS', '3'), 10),
  EMAIL_RETRY_BACKOFF_MS: parseInt(optionalEnv('EMAIL_RETRY_BACKOFF_MS', '5000'), 10),
} as const;
