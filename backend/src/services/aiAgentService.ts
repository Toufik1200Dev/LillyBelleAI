import { env } from '../config/env';
import { searchSharepointDocs, type SharepointSearchHit } from './sharepointSearchDb';
import { loadRecentConversationTurns } from './memoryService';
import { normalizeQuery } from './queryNormalizationService';

interface AgentInput {
  userId: string;
  conversationId: string;
  message: string;
}

interface AgentMetadata extends Record<string, unknown> {
  sources: Array<{ title: string; url: string; snippet: string }>;
  totalHits: number;
  returnedCount: number;
  searchQuery: string;
  fallbackSearchQuery?: string;
  searchAttempted: boolean;
}

interface AgentResult {
  response: string;
  metadata: AgentMetadata;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function firstWords(text: string, count: number): string {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(' ').trim();
}

function compactHits(hits: SharepointSearchHit[]): Array<{ title: string; folder: string; url: string }> {
  return hits.map((h) => ({ title: h.title, folder: h.folder, url: h.url }));
}

function formatSources(hits: Array<{ title: string; folder: string; url: string }>) {
  return hits.map((h, i) => `${i + 1}. ${h.title}\nDossier: ${h.folder}\nLien: ${h.url}`).join('\n\n');
}

function formatHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  if (history.length === 0) return 'Aucun historique récent.';
  return history.map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`).join('\n');
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('AGENT_TIMEOUT')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function callGemini(prompt: string): Promise<string> {
  const model = env.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const response = await runWithTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: env.AGENT_MAX_OUTPUT_TOKENS,
        },
      }),
    }),
    env.AGENT_TIMEOUT_MS
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }
  const data = (await response.json()) as GeminiResponse;
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim() ?? '';
  if (!text) throw new Error('Gemini returned empty content');
  return text;
}

function buildPrompt(args: {
  rawMessage: string;
  searchQuery: string;
  sourcesText: string;
  historyText: string;
  hasResults: boolean;
}): string {
  return [
    "Tu es l'assistant interne intelligent de la société Lillybelle France.",
    'Réponds toujours en français.',
    "N'invente jamais de documents ni de liens.",
    args.hasResults
      ? 'Tu as des résultats SharePoint. Résume brièvement et cite les liens trouvés.'
      : "Aucun résultat trouvé. Dis-le clairement et propose 2 alternatives de recherche concrètes.",
    '',
    `Message utilisateur: ${args.rawMessage}`,
    `Requête de recherche utilisée: ${args.searchQuery}`,
    '',
    `Historique récent:\n${args.historyText}`,
    '',
    `Résultats SharePoint:\n${args.sourcesText || '(aucun résultat)'}`,
    '',
    'Réponse attendue:',
    '- claire et concise',
    '- format markdown',
    '- si résultats: liste avec [Titre](URL) et dossier',
  ].join('\n');
}

export async function runCodeOnlyAgent(input: AgentInput): Promise<AgentResult> {
  const normalized = normalizeQuery(input.message);
  const history = await loadRecentConversationTurns(input.conversationId, env.AGENT_CONTEXT_WINDOW);

  if (normalized.isGreeting) {
    return {
      response:
        "Bonjour ! Je peux vous aider à retrouver des documents SharePoint. Donnez-moi des mots-clés, un numéro PO, ou un nom de fichier.",
      metadata: {
        sources: [],
        totalHits: 0,
        returnedCount: 0,
        searchQuery: normalized.searchQuery,
        searchAttempted: false,
      },
    };
  }

  const attempts = Math.max(1, env.AGENT_MAX_TOOL_CALLS);
  const primaryQuery = normalized.searchQuery;
  const fallbackQuery = firstWords(primaryQuery, 3);

  let hits = await searchSharepointDocs(primaryQuery, undefined, 8);
  let usedFallback = false;
  if (hits.length === 0 && attempts > 1 && fallbackQuery && fallbackQuery !== primaryQuery) {
    hits = await searchSharepointDocs(fallbackQuery, undefined, 8);
    usedFallback = true;
  }

  const compact = compactHits(hits).slice(0, 5);
  const historyText = formatHistory(history);
  const sourcesText = formatSources(compact);
  const prompt = buildPrompt({
    rawMessage: normalized.rawMessage,
    searchQuery: usedFallback ? fallbackQuery : primaryQuery,
    sourcesText,
    historyText,
    hasResults: compact.length > 0,
  });
  const responseText = await callGemini(prompt);

  if (env.AGENT_DEBUG_LOGS) {
    console.log('[aiAgentService] query=', normalized.searchQuery, 'hits=', compact.length);
  }

  return {
    response: responseText,
    metadata: {
      sources: compact.map((h) => ({ title: h.title, url: h.url, snippet: h.folder })),
      totalHits: hits.length,
      returnedCount: compact.length,
      searchQuery: primaryQuery,
      fallbackSearchQuery: usedFallback ? fallbackQuery : undefined,
      searchAttempted: true,
    },
  };
}

