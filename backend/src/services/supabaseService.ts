import { supabaseAdmin } from '../config/supabase';

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function getUserConversations(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createConversation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({ user_id: userId, title: 'New Conversation' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateConversation(
  id: string,
  userId: string,
  updates: { title?: string; is_archived?: boolean }
) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteConversation(id: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function verifyConversationOwner(conversationId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

// ─── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}

export async function saveMessage(params: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  tokensUsed?: number;
  responseTimeMs?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? {},
      tokens_used: params.tokensUsed,
      response_time_ms: params.responseTimeMs,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
