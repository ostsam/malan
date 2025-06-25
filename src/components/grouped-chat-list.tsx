import Link from 'next/link';
import { Bookmark, EditIcon, TrashIcon } from 'lucide-react';
import { Chat } from './app-sidebar';
import { groupChatsByDate } from '@/lib/chat-helpers';

interface GroupedChatListProps {
  chats: Chat[];
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onUpdateSlug: (chatId: string, currentSlug: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const groupOrder = ['Today', 'Yesterday', 'Previous Week'];

export const GroupedChatList = ({ chats, onTogglePin, onUpdateSlug, onDeleteChat }: GroupedChatListProps) => {
  const groupedChats = groupChatsByDate(chats);

  const sortedGroupKeys = Object.keys(groupedChats).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // For month-based groups, sort descending so newest months are first
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="space-y-2">
      {sortedGroupKeys.map((groupTitle) => (
        <div key={groupTitle}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 my-2">
            {groupTitle}
          </h3>
          <ul className="space-y-1 flex flex-col">
            {groupedChats[groupTitle].map((chat: Chat) => (
              <li
                key={chat.chatId}
                className="group flex items-stretch justify-between border-b border-gray-200 dark:border-gray-700 last:border-b-0 py-2"
              >
                <Link
                  href={`/chat/${chat.chatId}`}
                  className="flex-grow overflow-hidden pr-2"
                >
                  <div className="truncate font-medium text-sm">{chat.slug}</div>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-semibold">{chat.selectedLanguageLabel}</span>
                    {chat.lastMessageAt && (
                      <div className="text-right font-normal flex-shrink-0 ml-2">
                        <span>{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                        <span className="ml-2">{new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col justify-between items-end shrink-0">
                  <button
                    title="Pin chat"
                    className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                    onClick={() => onTogglePin(chat.chatId, chat.isPinned)}
                  >
                    <Bookmark className={`h-4 w-4 ${chat.isPinned ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                  </button>
                  <div className="flex">
                      <button
                        title="Edit slug"
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        onClick={() => onUpdateSlug(chat.chatId, chat.slug)}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete chat"
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        onClick={() => onDeleteChat(chat.chatId)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
