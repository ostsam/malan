import { loadChat } from "@/app/tools/chat-store";
import Chat from "@/app/ui/page";
import { notFound } from "next/navigation";

export default async function Page({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const { id } = params;

  // Prevent requests for source maps or other assets from being treated as chat IDs.
  if (id.includes(".")) {
    notFound();
  }

  const chatData = await loadChat(id);

  if (!chatData) {
    notFound();
  }

    const serializableChatData = {
    ...chatData,
    createdAt: chatData.createdAt?.toISOString(),
    messages: chatData.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt?.toISOString(),
    })),
  };

  return <Chat id={id} chatObject={serializableChatData} />;
}
