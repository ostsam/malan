import { loadChat } from "@/app/tools/chat-store";
import { notFound } from "next/navigation";
import Chat from "@/app/ui/page";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params; // get the chat ID from the URL
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

  return <Chat id={id} chatObject={serializableChatData} />; // display the chat
}
