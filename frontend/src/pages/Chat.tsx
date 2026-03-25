import { AppLayout } from '@/components/layout/AppLayout';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { InputBox } from '@/components/chat/InputBox';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { useChat } from '@/hooks/useChat';

export function Chat() {
  const {
    messages,
    isLoadingMessages,
    isTyping,
    activeConversationId,
    sendMessage,
  } = useChat();

  const showWelcome = !activeConversationId && messages.length === 0;

  const handleSuggestion = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <AppLayout>
      <div className="flex flex-col flex-1 overflow-hidden">
        {showWelcome ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <WelcomeScreen onSuggestionClick={handleSuggestion} />
          </div>
        ) : (
          <ChatWindow
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
          />
        )}

        <InputBox
          onSend={sendMessage}
          isDisabled={isLoadingMessages}
        />
      </div>
    </AppLayout>
  );
}
