import { env } from '../config/env';
import { searchSharepointDocs, type SharepointSearchHit } from './sharepointSearchDb';
import { loadRecentConversationTurns } from './memoryService';
import { normalizeQuery, detectLanguage, type Language } from './queryNormalizationService';

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


function firstWords(text: string, count: number): string {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(' ').trim();
}

function compactHits(hits: SharepointSearchHit[]): Array<{ title: string; folder: string; url: string }> {
  return hits.map((h) => ({ title: h.title, folder: h.folder, url: h.url }));
}

function formatSources(hits: Array<{ title: string; folder: string; url: string }>) {
  return hits.map((h, i) => `${i + 1}. ${h.title}\nFolder/Dossier: ${h.folder}\nURL: ${h.url}`).join('\n\n');
}

function formatHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  if (history.length === 0) return 'None / Aucun historique.';
  return history.map((m) => `${m.role === 'user' ? 'User/Utilisateur' : 'Assistant'}: ${m.content}`).join('\n');
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

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { metadata?: { retry_after_seconds?: number } };
}

const OPENROUTER_MAX_RETRIES = 3;

async function callOpenRouter(prompt: string): Promise<string> {
  let lastError = '';
  for (let attempt = 1; attempt <= OPENROUTER_MAX_RETRIES; attempt++) {
    const response = await runWithTimeout(
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://lillybelle.eu',
          'X-Title': 'LillyBelle AI Assistant',
        },
        body: JSON.stringify({
          model: env.OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: env.AGENT_MAX_OUTPUT_TOKENS,
          temperature: 0.4,
        }),
      }),
      env.AGENT_TIMEOUT_MS
    );

    if (response.status === 429) {
      const body = await response.text().catch(() => '{}');
      lastError = body;
      if (attempt < OPENROUTER_MAX_RETRIES) {
        let retryAfterMs = 5000;
        try {
          const parsed = JSON.parse(body) as OpenRouterResponse;
          const secs = parsed.error?.metadata?.retry_after_seconds;
          if (typeof secs === 'number') retryAfterMs = Math.ceil(secs) * 1000 + 500;
        } catch { /* use default */ }
        await new Promise((r) => setTimeout(r, retryAfterMs));
        continue;
      }
      throw new Error(`OpenRouter rate limited after ${OPENROUTER_MAX_RETRIES} attempts: ${body}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenRouter API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw new Error('OpenRouter returned empty content');
    return text;
  }
  throw new Error(`OpenRouter failed after ${OPENROUTER_MAX_RETRIES} attempts: ${lastError}`);
}

function buildPrompt(args: {
  rawMessage: string;
  searchQuery: string;
  sourcesText: string;
  historyText: string;
  hasResults: boolean;
  language: Language;
}): string {
  const langRule =
    args.language === 'en'
      ? 'The user is writing in English. Reply in English.'
      : args.language === 'mixed'
        ? "The user is mixing French and English. Detect their dominant language and reply accordingly."
        : "L'utilisateur écrit en français. Réponds en français.";

  const resultsBlock = args.hasResults
    ? [
        'SharePoint documents were found. You MUST include every document as a clickable markdown link in your reply.',
        'Format REQUIRED for each document: [Document Title](URL) — Folder: <folder name>',
        'List ALL documents from the SharePoint results below. Do NOT omit any link.',
        'After listing the links, add a short description of what each document likely contains based on its title and folder.',
        'CRITICAL: never skip the links. A response without markdown links is WRONG.',
      ].join('\n')
    : [
        'No exact SharePoint results were found for this query.',
        'DO NOT just say "no results found" or "aucun résultat".',
        'Instead:',
        '  1. Acknowledge what the user was looking for in a natural way.',
        '  2. Suggest 2-3 concrete alternative search terms they could try.',
        '  3. If the query was unclear or short, show your best interpretation and invite them to refine it.',
        '  4. Stay helpful, constructive, and never leave the user with nothing to do next.',
      ].join('\n');

  return [
    '=== SYSTEM ===',
    'You are an intelligent multilingual internal assistant for Lillybelle France.',
    'You help employees find internal SharePoint documents.',
    langRule,
    '',
    '--- BEHAVIOR RULES ---',
    '1. LANGUAGE: Always detect and match the user\'s language (French, English, mixed, or SMS/slang). Reply in the same language.',
    '2. TYPOS & INTENT: If the message is unclear, misspelled, incomplete, or in slang — intelligently estimate the intended meaning. Correct errors internally. Infer what the user most likely wants.',
    '3. NEVER OVER-REFUSE: Do not say "I cannot understand" or "Please rephrase" unless it is truly impossible to infer intent. Always attempt intelligent interpretation first.',
    '4. CLARIFICATION: Only ask for clarification when absolutely necessary. When multiple interpretations are possible, pick the most probable one and briefly mention alternatives.',
    '5. STYLE: Natural, helpful, human-like. Short when possible, detailed when needed. Never robotic or formulaic.',
    '6. SHORT MESSAGES: Single words, broken sentences, abbreviations, slang — always try to infer intent.',
    '7. CONTEXT: Use the conversation history to maintain continuity across messages.',
    '',
    '--- SHAREPOINT RULES ---',
    resultsBlock,
    'You can only see document title, folder, and URL — NOT the file contents.',
    'NEVER invent or fabricate document links or titles.',
    '',
    '=== CONVERSATION ===',
    `User message: ${args.rawMessage}`,
    `Search query used: ${args.searchQuery}`,
    '',
    `Recent history:\n${args.historyText}`,
    '',
    `SharePoint results:\n${args.sourcesText || '(none)'}`,
    '',
    '=== RESPONSE ===',
    args.hasResults
      ? '(Reply now. You MUST include every SharePoint document as a markdown link [Title](URL). No links = invalid response.)'
      : '(Reply now, matching the user\'s language and tone. Be concise, actionable, and helpful.)',
  ].join('\n');
}

function greetingResponse(lang: Language): string {
  if (lang === 'en') {
    return "Hey! How can I help you today? I can help you find internal SharePoint documents — just share some keywords, a PO number, or a file name.";
  }
  if (lang === 'mixed') {
    return "Hey / Bonjour ! How can I help you / Comment puis-je vous aider ? Give me some keywords or a document name and I'll search SharePoint for you.";
  }
  return "Bonjour ! Comment puis-je vous aider ? Je peux vous aider à retrouver des documents SharePoint. Donnez-moi des mots-clés, un numéro PO, ou un nom de fichier.";
}

export async function runCodeOnlyAgent(input: AgentInput): Promise<AgentResult> {
  const normalized = normalizeQuery(input.message);
  const language = detectLanguage(input.message);
  const history = await loadRecentConversationTurns(input.conversationId, env.AGENT_CONTEXT_WINDOW);

  if (normalized.isGreeting) {
    return {
      response: greetingResponse(language),
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
    language,
  });
  const responseText = await callOpenRouter(prompt);

  if (env.AGENT_DEBUG_LOGS) {
    console.log('[aiAgentService] query=', normalized.searchQuery, 'hits=', compact.length, 'lang=', language);
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
