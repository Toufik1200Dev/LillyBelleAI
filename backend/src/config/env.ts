import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ?? '',
  /** Trimmed — avoids 401 when Render/n8n copies include accidental newlines/spaces. */
  N8N_API_KEY: (process.env.N8N_API_KEY ?? '').trim(),
  /** HTTP timeout when backend calls n8n webhook (ms). */
  N8N_TIMEOUT_MS: parseInt(process.env.N8N_TIMEOUT_MS ?? '90000', 10),
  /** Number of retries for timeout/abort or 5xx responses from n8n. */
  N8N_MAX_RETRIES: parseInt(process.env.N8N_MAX_RETRIES ?? '1', 10),
  /**
   * Secret for POST /api/internal/sharepoint-search. If non-empty, this value is used (not N8N_API_KEY).
   * n8n Header Auth must match THIS var when set on Render; otherwise match N8N_API_KEY.
   */
  SHAREPOINT_SEARCH_INTERNAL_KEY: (process.env.SHAREPOINT_SEARCH_INTERNAL_KEY ?? '').trim(),
  /** Optional override for the folder containing sharepoint_metadata.json (default: src/n8n-data). */
  N8N_DATA_DIR: process.env.N8N_DATA_DIR ?? '',
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
