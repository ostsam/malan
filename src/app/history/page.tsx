import { auth } from "@/app/api/auth/[...all]/auth";
import { loadUserChatHistory, type ChatMetadata } from "@/app/tools/chat-store";
import ChatHistory from "@/components/chat-history";
import DashboardButton from "@/components/dashboard-button";
import Logout from "@/components/logout";
import { Menubar } from "@/components/ui/menubar";
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
    <>
    <Menubar className="px-6 fixed top-0 left-0 right-0">
    <DashboardButton />
    <div className="absolute left-1/2 transform -translate-x-1/2">
      <img src="/logo.svg" alt="Malan Logo" className="h-16 w-auto" />
    </div>
    <div className="flex-1 flex justify-end">
      <Logout />
    </div>
  </Menubar>
    <div className="flex flex-col mt-10 items-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Chat History</h1>
        {chats.length > 0 ? (
          <ul className="space-y-4">
            {chats.map((chat: ChatMetadata) => (
              <li key={chat.id} className="border-b border-gray-200 pb-4">
                <Link href={`/chat/${chat.id}`} className="block p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <p className="font-semibold text-gray-700">Chat Session from {new Date(chat.createdAt).toLocaleString()}</p>
                  <div className="flex space-x-4 mt-2">
                    <span className="text-sm text-gray-600">Language: {chat.settings.selectedLanguageLabel}</span>
                    <span className="text-sm text-gray-600">Level: {chat.settings.selectedLevel}</span>
                  </div>
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
    </>
  );
}
