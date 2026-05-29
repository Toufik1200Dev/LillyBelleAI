import 'dotenv/config';

/** Strip accidental quotes from Render / copy-paste env values */
function envString(key: string, fallback = ''): string {
  const raw = process.env[key] ?? fallback;
  return raw.trim().replace(/^['"]|['"]$/g, '');
}

function envInt(key: string, fallback: number): number {
  const value = parseInt(process.env[key] ?? String(fallback), 10);
  return Number.isFinite(value) ? value : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = envString(key, String(fallback));
  return raw.toLowerCase() === 'true';
}

export const env = {
  PORT: envInt('PORT', 3000),
  NODE_ENV: envString('NODE_ENV', 'development'),
  SUPABASE_URL: envString('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: envString('SUPABASE_SERVICE_ROLE_KEY'),
  N8N_WEBHOOK_URL: envString('N8N_WEBHOOK_URL'),
  /** Trimmed — avoids 401 when Render/n8n copies include accidental newlines/spaces. */
  N8N_API_KEY: envString('N8N_API_KEY'),
  /** HTTP timeout when backend calls n8n webhook (ms). */
  N8N_TIMEOUT_MS: envInt('N8N_TIMEOUT_MS', 90000),
  /** Number of retries for timeout/abort or 5xx responses from n8n. */
  N8N_MAX_RETRIES: envInt('N8N_MAX_RETRIES', 1),
  /** OpenRouter API key for the in-code AI orchestration. */
  OPENROUTER_API_KEY: envString('OPENROUTER_API_KEY'),
  /** Default model for the in-code AI orchestration. */
  OPENROUTER_MODEL: envString('OPENROUTER_MODEL', 'openai/gpt-4o-mini:free'),
  /** Number of user+assistant turn pairs loaded as chat memory. */
  AGENT_CONTEXT_WINDOW: envInt('AGENT_CONTEXT_WINDOW', 6),
  /** Max search attempts (initial + fallback). */
  AGENT_MAX_TOOL_CALLS: envInt('AGENT_MAX_TOOL_CALLS', 2),
  /** LLM call timeout in milliseconds. */
  AGENT_TIMEOUT_MS: envInt('AGENT_TIMEOUT_MS', 30000),
  /** Max output tokens for LLM generation. */
  AGENT_MAX_OUTPUT_TOKENS: envInt('AGENT_MAX_OUTPUT_TOKENS', 1024),
  /** Optional: verbose orchestration logs in backend console. */
  AGENT_DEBUG_LOGS: envBool('AGENT_DEBUG_LOGS', false),
  /** Optional kill switch to keep old n8n path disabled by config. */
  DISABLE_N8N_PATH: envBool('DISABLE_N8N_PATH', true),
  /**
   * Secret for POST /api/internal/sharepoint-search/reindex. If non-empty, used instead of N8N_API_KEY.
   * Header: X-Internal-Search-Key (or Bearer). Search uses INTERNAL_API_KEY + x-internal-api-key.
   */
  SHAREPOINT_SEARCH_INTERNAL_KEY: envString('SHAREPOINT_SEARCH_INTERNAL_KEY'),
  /** API key for POST /api/internal/sharepoint-search (header x-internal-api-key). */
  INTERNAL_API_KEY: envString('INTERNAL_API_KEY'),
  /** Optional override for the folder containing sharepoint_metadata.json (default: src/n8n-data). */
  N8N_DATA_DIR: envString('N8N_DATA_DIR'),
  CORS_ORIGIN: envString('CORS_ORIGIN', 'http://localhost:5173').replace(/\/$/, ''),
  RATE_LIMIT_WINDOW_MS: envInt('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: envInt('RATE_LIMIT_MAX_REQUESTS', 20),
  isProd: envString('NODE_ENV', 'development') === 'production',
} as const;

// Validate required env vars on startup
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENROUTER_API_KEY'];
for (const key of required) {
  if (!envString(key)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
