import axios from 'axios';
import type { Conversation, Message } from '@/types/chat';
import type { ApiResponse, ChatApiResponse } from '@/types/api';
import { supabase } from './supabase';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Attach Supabase JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token && !error) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Une erreur inattendue s’est produite.';
    return Promise.reject(new Error(message));
  }
);

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversationsApi = {
  list: () =>
    apiClient.get<ApiResponse<Conversation[]>>('/conversations').then((r) => r.data),

  create: () =>
    apiClient.post<ApiResponse<Conversation>>('/conversations').then((r) => r.data),

  update: (id: string, data: Partial<Pick<Conversation, 'title' | 'is_archived'>>) =>
    apiClient.patch<ApiResponse<Conversation>>(`/conversations/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/conversations/${id}`).then((r) => r.data),

  getMessages: (id: string) =>
    apiClient.get<ApiResponse<Message[]>>(`/conversations/${id}/messages`).then((r) => r.data),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  sendMessage: (conversationId: string, message: string) =>
    apiClient
      .post<ApiResponse<ChatApiResponse>>('/chat', { conversationId, message })
      .then((r) => r.data),
};
