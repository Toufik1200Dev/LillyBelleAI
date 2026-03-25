import type { N8nRequest, N8nResponse } from '@/types/api';

const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string;
const apiKey = import.meta.env.VITE_N8N_API_KEY as string;

/**
 * Directly call n8n webhook — only used if there is no backend proxy.
 * Prefer using api.ts → /api/chat when the backend is available.
 */
export async function callN8nWebhook(payload: N8nRequest): Promise<N8nResponse> {
  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL is not configured.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<N8nResponse>;
}
