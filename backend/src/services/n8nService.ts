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

export async function callN8n(payload: N8nPayload): Promise<N8nResponse> {
  if (!env.N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.N8N_API_KEY) {
    headers['X-API-Key'] = env.N8N_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000); // 55s timeout

  try {
    const resp = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`n8n webhook returned ${resp.status}: ${body}`);
    }

    const data = (await resp.json()) as N8nResponse;
    if (!data.success || !data.response) {
      throw new Error('n8n returned an invalid or empty response');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
