// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
}

export interface N8nRequest {
  userId: string;
  conversationId: string;
  message: string;
  context: {
    previousMessages: Array<{ role: string; content: string }>;
  };
}

export interface N8nResponse {
  success: boolean;
  response: string;
  metadata?: {
    sources?: Array<{ title: string; url: string; snippet: string }>;
    confidence?: number;
    processingTime?: number;
  };
}

export interface ChatApiResponse {
  userMessage: {
    id: string;
    role: 'user';
    content: string;
    created_at: string;
  };
  assistantMessage: {
    id: string;
    role: 'assistant';
    content: string;
    created_at: string;
    metadata: {
      sources?: Array<{ title: string; url: string; snippet: string }>;
      confidence?: number;
    };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
