import { auth } from "@/app/api/auth/[...all]/auth";
import { loadUserChatHistory, type ChatSummary } from "@/app/tools/chat-store";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const chats = await loadUserChatHistory(session.user.id);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Chat History</h1>
        {chats.length > 0 ? (
          <ul className="space-y-4">
            {chats.map((chat: ChatSummary) => (
              <li key={chat.id} className="border-b border-gray-200 pb-4">
                <Link href={`/chat/${chat.id}`} className="block p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <p className="font-semibold text-gray-700">Chat from {new Date(chat.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">ID: {chat.id}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">You have no chat history yet.</p>
            <Link href="/" className="mt-4 inline-block px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Start a New Chat
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
