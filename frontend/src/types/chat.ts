// ─── Chat Types ───────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageSource {
  title: string;
  url: string;
  snippet: string;
}

export interface MessageMetadata {
  sources?: MessageSource[];
  confidence?: number;
  processingTime?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  metadata: MessageMetadata;
  tokens_used?: number;
  response_time_ms?: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  isSending: boolean;
}
