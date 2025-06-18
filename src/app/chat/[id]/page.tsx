import { loadChat } from "@/app/tools/chat-store";
import Chat from "@/app/ui/page";

export default async function Page({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { id } = params;

  const messages = await loadChat(id);
  return <Chat id={id} initialMessages={messages} />;
}