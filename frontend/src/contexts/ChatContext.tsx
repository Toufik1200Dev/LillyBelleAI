import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
// Use native crypto API — no external dependency needed
import type { Message, Conversation, ChatState } from '@/types/chat';

import { chatApi, conversationsApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage, logError } from '@/utils/errorHandler';
import toast from 'react-hot-toast';

interface ChatContextValue extends ChatState {
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ChatState>({
    conversations: [],
    activeConversationId: null,
    messages: [],
    isLoadingMessages: false,
    isTyping: false,
    isSending: false,
  });

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    const res = await conversationsApi.list();
    if (res.success && res.data) {
      setState((prev) => ({ ...prev, conversations: res.data! }));
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshConversations();
    else setState((prev) => ({ ...prev, conversations: [], activeConversationId: null, messages: [] }));
  }, [user, refreshConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, activeConversationId: id, isLoadingMessages: true, messages: [] }));
    try {
      const res = await conversationsApi.getMessages(id);
      if (res.success && res.data) {
        setState((prev) => ({ ...prev, messages: res.data!, isLoadingMessages: false }));
      }
    } catch (err) {
      logError(err, 'selectConversation');
      setState((prev) => ({ ...prev, isLoadingMessages: false }));
    }
  }, []);

  const createConversation = useCallback(async (): Promise<Conversation> => {
    const res = await conversationsApi.create();
    if (!res.success || !res.data) throw new Error('Impossible de créer la conversation');
    setState((prev) => ({
      ...prev,
      conversations: [res.data!, ...prev.conversations],
      activeConversationId: res.data!.id,
      messages: [],
    }));
    return res.data!;
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await conversationsApi.delete(id);
    setState((prev) => {
      const next = { ...prev, conversations: prev.conversations.filter((c) => c.id !== id) };
      if (prev.activeConversationId === id) {
        next.activeConversationId = null;
        next.messages = [];
      }
      return next;
    });
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    await conversationsApi.update(id, { title });
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    }));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || state.isSending) return;

    let convId = state.activeConversationId;

    // Auto-create conversation if none is active
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv.id;
      } catch (err) {
        toast.error(getErrorMessage(err));
        return;
      }
    }

    const optimisticUserMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      metadata: {},
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, optimisticUserMsg],
      isTyping: true,
      isSending: true,
    }));

    try {
      const res = await chatApi.sendMessage(convId, content);
      if (!res.success || !res.data) throw new Error('Réponse du serveur invalide');

      const { userMessage, assistantMessage } = res.data;

      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages.filter((m) => m.id !== optimisticUserMsg.id),
          { ...userMessage, conversation_id: convId!, metadata: {} },
          { ...assistantMessage, conversation_id: convId!, metadata: assistantMessage.metadata ?? {} },
        ],
        isTyping: false,
        isSending: false,
      }));

      // Refresh conversations to pick up new title from trigger
      await refreshConversations();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      const assistantErrorMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: convId!,
        role: 'assistant',
        content: errorMsg,
        created_at: new Date().toISOString(),
        metadata: {},
        isError: true,
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantErrorMsg],
        isTyping: false,
        isSending: false,
      }));
    }
  }, [user, state.activeConversationId, state.isSending, createConversation, refreshConversations]);

  return (
    <ChatContext.Provider value={{
      ...state,
      selectConversation,
      createConversation,
      deleteConversation,
      renameConversation,
      sendMessage,
      refreshConversations,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext doit être utilisé dans un ChatProvider');
  return ctx;
}
