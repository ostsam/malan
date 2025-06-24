import { auth } from "@/app/api/auth/[...all]/auth";
import { loadUserChatHistory, type ChatMetadata } from "@/app/tools/chat-store";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteChat } from '@/app/actions/chat';

export default async function HistoryPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const chats = await loadUserChatHistory(session.user.id);

  return (
    <div className="flex flex-col mt-10 items-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Chat History</h1>
        {chats.length > 0 ? (
          <ul className="space-y-4">
            {chats.map((chat: ChatMetadata) => (
              <li key={chat.id} className="border-b border-gray-200 pb-4 flex justify-between items-center">
                <Link 
                  href={`/chat/${chat.id}`} 
                  className="block p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex-grow"
                >
                  <p className="font-semibold text-gray-700">Chat Session from {new Date(chat.createdAt).toLocaleString()}</p>
                  <div className="flex space-x-4 mt-2">
                    <span className="text-sm text-gray-600">Language: {chat.settings.selectedLanguageLabel}</span>
                    <span className="text-sm text-gray-600">Level: {chat.settings.selectedLevel}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">ID: {chat.id}</p>
                </Link>
                <form action={deleteChat.bind(null, chat.id)}>
                  <button 
                    type="submit"
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    onClick={(e) => {
                      if (!confirm('Are you sure you want to delete this chat?')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </form>
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
