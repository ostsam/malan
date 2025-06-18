import { loadChat } from "@/app/tools/chat-store";
import Chat from "@/app/ui/page";

export default async function Page({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { id } = params;

  const chatData = await loadChat(id);
  return <Chat id={id} initialMessages={chatData.messages} settings={chatData.settings} />;
}