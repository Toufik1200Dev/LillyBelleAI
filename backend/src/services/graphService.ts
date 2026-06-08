import { env } from '../config/env';

// ─── Token cache ───────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;

async function getGraphToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token;
  }

  const url = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.AZURE_CLIENT_ID,
    client_secret: env.AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _tokenCache.token;
}

// ─── Search ────────────────────────────────────────────────────────────────────

export interface GraphSearchHit {
  title: string;
  webUrl: string;
  path: string;
  id: string;
  driveId: string;
  itemId: string;
}

interface GraphSearchResponse {
  value: Array<{
    hitsContainers: Array<{
      hits?: Array<{
        resource: {
          id: string;
          name: string;
          webUrl: string;
          parentReference?: { driveId?: string; path?: string };
        };
      }>;
    }>;
  }>;
}

export async function searchSharepoint(query: string, size = 10): Promise<GraphSearchHit[]> {
  const token = await getGraphToken();

  // Do NOT include a `fields` array — requesting navigation properties like
  // `parentReference` triggers a two-step fanout in Microsoft's search backend
  // that consistently times out (FanoutExternalTimeoutException / HTTP 500).
  // Graph Search returns name, webUrl, and id by default without extra fan-out.
  const requestBody = {
    requests: [
      {
        entityTypes: ['driveItem'],
        query: { queryString: query },
        from: 0,
        size,
        region: env.GRAPH_SEARCH_REGION,
      },
    ],
  };

  console.log('[graphService] POST https://graph.microsoft.com/v1.0/search/query');
  console.log('[graphService] Request body:', JSON.stringify(requestBody, null, 2));

  const res = await fetch('https://graph.microsoft.com/v1.0/search/query', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[graphService] Response status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[graphService] Response body:', text);
    throw new Error(`Graph search error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GraphSearchResponse;
  const hits: GraphSearchHit[] = [];

  for (const result of data.value ?? []) {
    for (const container of result.hitsContainers ?? []) {
      for (const hit of container.hits ?? []) {
        const r = hit.resource;
        const driveId = r.parentReference?.driveId ?? '';
        hits.push({
          title: r.name,
          webUrl: r.webUrl,
          path: r.parentReference?.path ?? '',
          id: r.id,
          driveId,
          itemId: r.id,
        });
      }
    }
  }

  return hits;
}

// ─── Fallback: drive-root search ───────────────────────────────────────────────
// Used when POST /v1.0/search/query returns 500 (e.g. Graph Search service timeout).
// Requires SHAREPOINT_SITE_ID to be set.

export async function searchSharepointFallback(
  query: string,
  size = 10
): Promise<GraphSearchHit[]> {
  const siteId = env.SHAREPOINT_SITE_ID;
  if (!siteId) throw new Error('SHAREPOINT_SITE_ID is not configured — fallback search unavailable');

  const token = await getGraphToken();
  const url = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive/root/search(q='${encodeURIComponent(query)}')`;

  console.log('[graphService] Fallback GET', url);

  const res = await fetch(`${url}?$top=${size}&$select=id,name,webUrl,parentReference`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('[graphService] Fallback response status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[graphService] Fallback response body:', text);
    throw new Error(`Graph fallback search error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      name: string;
      webUrl: string;
      parentReference?: { driveId?: string; path?: string };
    }>;
  };

  return (data.value ?? []).map((item) => ({
    title: item.name,
    webUrl: item.webUrl,
    path: item.parentReference?.path ?? '',
    id: item.id,
    driveId: item.parentReference?.driveId ?? '',
    itemId: item.id,
  }));
}

// ─── File fetch ────────────────────────────────────────────────────────────────

export interface GraphFileResult {
  name: string;
  mimeType: string;
  sizeBytes: number;
  contentType: 'text' | 'binary';
  content: string | null;
  message?: string;
}

interface GraphItemMeta {
  name: string;
  size: number;
  file?: { mimeType: string };
}

const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/ld+json',
];

function isTextMime(mimeType: string): boolean {
  return TEXT_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

export async function getSharepointFile(driveId: string, itemId: string): Promise<GraphFileResult> {
  const token = await getGraphToken();
  const base = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`;

  const metaRes = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  if (!metaRes.ok) {
    const text = await metaRes.text().catch(() => '');
    throw new Error(`Graph item metadata error ${metaRes.status}: ${text}`);
  }
  const meta = (await metaRes.json()) as GraphItemMeta;

  const mimeType = meta.file?.mimeType ?? 'application/octet-stream';
  const sizeBytes = meta.size ?? 0;

  const contentRes = await fetch(`${base}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!contentRes.ok) {
    const text = await contentRes.text().catch(() => '');
    throw new Error(`Graph file content error ${contentRes.status}: ${text}`);
  }

  if (isTextMime(mimeType)) {
    const text = await contentRes.text();
    return { name: meta.name, mimeType, sizeBytes, contentType: 'text', content: text };
  }

  // Binary formats (pdf, docx, xlsx, pptx, etc.) — no parser installed.
  // Return metadata so the agent can still tell the user where to open the file.
  return {
    name: meta.name,
    mimeType,
    sizeBytes,
    contentType: 'binary',
    content: null,
    message: `Binary file (${mimeType}, ${(sizeBytes / 1024).toFixed(1)} KB). Open the SharePoint link to view its contents.`,
  };
}
