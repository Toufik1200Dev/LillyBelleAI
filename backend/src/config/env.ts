import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ?? '',
  N8N_API_KEY: process.env.N8N_API_KEY ?? '',
  CORS_ORIGIN: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, ''),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '20', 10),
  isProd: process.env.NODE_ENV === 'production',
} as const;

// Validate required env vars on startup
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'N8N_WEBHOOK_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
