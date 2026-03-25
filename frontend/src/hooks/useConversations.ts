import { useCallback } from 'react';
import { useChatContext } from '@/contexts/ChatContext';

export function useConversations() {
  const ctx = useChatContext();

  const newConversation = useCallback(async () => {
    const conv = await ctx.createConversation();
    return conv;
  }, [ctx]);

  return {
    conversations: ctx.conversations,
    activeConversationId: ctx.activeConversationId,
    selectConversation: ctx.selectConversation,
    createConversation: newConversation,
    deleteConversation: ctx.deleteConversation,
    renameConversation: ctx.renameConversation,
    refreshConversations: ctx.refreshConversations,
  };
}
