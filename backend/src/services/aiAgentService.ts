import { env } from '../config/env';
import { searchSharepoint } from './graphService';
import { searchSharepointDocs } from './sharepointSearchDb';
import { loadRecentConversationTurns } from './memoryService';
import { normalizeQuery, type Language } from './queryNormalizationService';

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


type CompactHit = { title: string; folder: string; url: string };

function isGraphConfigured(): boolean {
  return Boolean(env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET);
}

async function runSharepointSearch(
  queries: string[]
): Promise<{ hits: CompactHit[]; usedQuery: string }> {
  for (let i = 0; i < Math.min(queries.length, 8); i++) {
    const q = queries[i];

    if (isGraphConfigured()) {
      const graphHits = await searchSharepoint(q, 10);
      if (graphHits.length > 0) {
        return {
          hits: graphHits.map((h) => ({ title: h.title, folder: h.path, url: h.webUrl })),
          usedQuery: q,
        };
      }
    } else {
      // Supabase fallback when Azure credentials are not set
      const dbHits = await searchSharepointDocs(q, undefined, 10);
      if (dbHits.length > 0) {
        return {
          hits: dbHits.map((h) => ({ title: h.title, folder: h.folder, url: h.url })),
          usedQuery: q,
        };
      }
    }
  }

  const last = queries[queries.length - 1] ?? '';
  return { hits: [], usedQuery: last };
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

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type?: string; message?: string };
}

const CLAUDE_MAX_RETRIES = 3;

async function callClaude(prompt: string): Promise<string> {
  let lastError = '';
  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    const response = await runWithTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.CLAUDE_MODEL,
          max_tokens: env.AGENT_MAX_OUTPUT_TOKENS,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        }),
      }),
      env.AGENT_TIMEOUT_MS
    );

    if (response.status === 429) {
      const body = await response.text().catch(() => '{}');
      lastError = body;
      if (attempt < CLAUDE_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      throw new Error(`Claude rate limited after ${CLAUDE_MAX_RETRIES} attempts: ${body}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Claude API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    const text =
      data.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('')
        .trim() ?? '';
    if (!text) throw new Error('Claude returned empty content');
    return text;
  }
  throw new Error(`Claude failed after ${CLAUDE_MAX_RETRIES} attempts: ${lastError}`);
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
    'If the user asks for a "numéro de commande", "order number", or similar: when matching documents exist, list them with links and explain the number is likely inside the document (user must open the link). Do NOT say "no documents" if relevant files were returned.',
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
  const { language } = normalized;
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

  if (normalized.isTooVague) {
    return {
      response:
        language === 'en'
          ? "Could you be more specific? Share a document name, PO number, or a few keywords and I'll search SharePoint for you."
          : language === 'mixed'
          ? "Pourriez-vous préciser / Could you be more specific? Share a file name, PO number, or keywords."
          : "Pourriez-vous préciser votre demande ? Partagez un nom de fichier, un numéro de commande ou quelques mots-clés.",
      metadata: {
        sources: [],
        totalHits: 0,
        returnedCount: 0,
        searchQuery: normalized.searchQuery,
        searchAttempted: false,
      },
    };
  }

  const { hits, usedQuery } = await runSharepointSearch(normalized.searchQueries);
  const usedFallback = usedQuery !== normalized.searchQueries[0];

  const compact = hits.slice(0, 5);
  const historyText = formatHistory(history);
  const sourcesText = formatSources(compact);
  const prompt = buildPrompt({
    rawMessage: normalized.rawMessage,
    searchQuery: usedQuery,
    sourcesText,
    historyText,
    hasResults: compact.length > 0,
    language,
  });
  const responseText = await callClaude(prompt);

  if (env.AGENT_DEBUG_LOGS) {
    console.log('[aiAgentService] query=', normalized.searchQuery, 'hits=', compact.length, 'lang=', language);
  }

  return {
    response: responseText,
    metadata: {
      sources: compact.map((h) => ({ title: h.title, url: h.url, snippet: h.folder })),
      totalHits: hits.length,
      returnedCount: compact.length,
      searchQuery: usedQuery,
      fallbackSearchQuery: usedFallback ? usedQuery : undefined,
      searchQueriesTried: normalized.searchQueries,
      searchAttempted: true,
    },
  };
}
