import { loadChat } from "@/app/tools/chat-store";
import Chat from "@/app/ui/page";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCachedRender } from "@/lib/render-cache";

// Cache the loadChat function to prevent duplicate database calls
const cachedLoadChat = cache(loadChat);

export default async function Page({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const { id } = params;

  console.log(`[CHAT_PAGE_SERVER_COMPONENT] Rendering chat page for id: ${id}`);

  // Prevent requests for source maps or other assets from being treated as chat IDs.
  if (id.includes(".")) {
    notFound();
  }

  // Use global render cache to prevent duplicate renders in React Strict Mode
  const serializableChatData = await getCachedRender(`chat:${id}`, async () => {
    const chatData = await cachedLoadChat(id);

    if (!chatData) {
      notFound();
    }

    return {
      ...chatData,
      createdAt: chatData.createdAt?.toISOString(),
      messages: chatData.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt?.toISOString(),
      })),
    };
  });

  return <Chat id={id} chatObject={serializableChatData} />;
}
