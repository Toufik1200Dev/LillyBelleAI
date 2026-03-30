import { env } from '../config/env';

interface N8nPayload {
  userId: string;
  conversationId: string;
  message: string;
  context: {
    previousMessages: Array<{ role: string; content: string }>;
  };
}

interface N8nResponse {
  success: boolean;
  response: string;
  metadata?: {
    sources?: Array<{ title: string; url: string; snippet: string }>;
    confidence?: number;
    processingTime?: number;
  };
}

function isRetryableHttp(status: number): boolean {
  return status === 429 || status >= 500;
}

function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return err.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout');
}

async function callN8nOnce(payload: N8nPayload): Promise<N8nResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.N8N_API_KEY) {
    headers['X-API-Key'] = env.N8N_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.N8N_TIMEOUT_MS);

  try {
    const resp = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      if (isRetryableHttp(resp.status)) {
        throw new Error(`N8N_RETRYABLE_HTTP_${resp.status}:${body}`);
      }
      throw new Error(`Le webhook n8n a renvoyé ${resp.status} : ${body}`);
    }

    const text = await resp.text();
    if (!text) {
      throw new Error('n8n a renvoyé une réponse vide. Vérifiez que le flux atteint le nœud « Respond to Webhook ».');
    }

    let data: N8nResponse;
    try {
      data = JSON.parse(text) as N8nResponse;
    } catch (_e) {
      throw new Error(`n8n a renvoyé du JSON invalide : ${text.slice(0, 100)}...`);
    }

    if (!data.success || !data.response) {
      throw new Error('n8n a renvoyé une réponse vide ou invalide');
    }

    return data;
  } catch (err) {
    if (isAbortLikeError(err)) {
      throw new Error('N8N_RETRYABLE_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callN8n(payload: N8nPayload): Promise<N8nResponse> {
  if (!env.N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL n’est pas configurée');
  }
  const maxRetries = Math.max(0, env.N8N_MAX_RETRIES);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callN8nOnce(payload);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = msg.startsWith('N8N_RETRYABLE_HTTP_') || msg === 'N8N_RETRYABLE_TIMEOUT';
      if (!retryable || attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }

  if (lastErr instanceof Error && lastErr.message === 'N8N_RETRYABLE_TIMEOUT') {
    throw new Error(
      "Le service d'IA prend trop de temps à répondre. Merci de réessayer dans un instant."
    );
  }
  if (lastErr instanceof Error && lastErr.message.startsWith('N8N_RETRYABLE_HTTP_')) {
    throw new Error("Le service d'IA est temporairement indisponible. Merci de réessayer.");
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
