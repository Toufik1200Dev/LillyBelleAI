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
          temperature: 0.4,
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
        'SharePoint results were found. Summarize them briefly and cite each document as [Title](URL) with its folder.',
        'Tell the user what each document likely contains based on its title and folder.',
        'Be helpful and direct — the user cannot see file contents, only titles/folders/links.',
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
    '(Reply now, matching the user\'s language and tone. Be concise, actionable, and helpful.)',
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
  const responseText = await callGemini(prompt);

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
