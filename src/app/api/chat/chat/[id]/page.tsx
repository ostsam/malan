import { loadChat } from "@/app/tools/chat-store";
import Chat from "@/app/ui/page";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params; // get the chat ID from the URL
  const messages = await loadChat(id); // load the chat messages
  return <Chat id={id} initialMessages={messages} />; // display the chat
}
