import * as db from './supabaseService';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

function toTurn(role: string, content: string): ConversationTurn | null {
  if ((role === 'user' || role === 'assistant') && content.trim().length > 0) {
    return { role, content };
  }
  return null;
}

export async function loadRecentConversationTurns(
  conversationId: string,
  contextWindowLength: number
): Promise<ConversationTurn[]> {
  const all = await db.getMessages(conversationId);
  const maxTurns = Math.max(1, contextWindowLength) * 2;
  const selected = all.slice(-maxTurns);
  return selected
    .map((m) => toTurn(String(m.role ?? ''), String(m.content ?? '')))
    .filter((v): v is ConversationTurn => Boolean(v));
}

