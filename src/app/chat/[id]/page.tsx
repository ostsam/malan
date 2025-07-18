import { Suspense } from "react";
import { getChat } from "@/app/actions/chat";
import { ChatSession } from "@/components/chat/ChatSession";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Simple loading component
function ChatLoading() {
  return (
    <div className="flex flex-col w-full max-w-xl mx-auto h-screen text-lg bg-white dark:bg-black overflow-hidden font-inter">
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading chat...</p>
        </div>
      </div>
    </div>
  );
}

async function ChatPageContent({ params }: ChatPageProps) {
  const { id } = await params;
  const chatObject = await getChat(id);

  if (!chatObject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chat not found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            The chat you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Normalize settings to convert undefined to null for SerializableChatData
  const normalizedChatObject = {
    ...chatObject,
    settings: {
      ...chatObject.settings,
      selectedLanguage: chatObject.settings.selectedLanguage ?? null,
      nativeLanguage: chatObject.settings.nativeLanguage ?? null,
    },
    messages: chatObject.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    })),
    createdAt: chatObject.createdAt ? new Date(chatObject.createdAt).toISOString() : new Date().toISOString(),
  };

  return (
    <ChatSession id={id} chatObject={normalizedChatObject} demoMode={false} />
  );
}

export default function ChatPage(props: ChatPageProps) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatPageContent {...props} />
    </Suspense>
  );
}
