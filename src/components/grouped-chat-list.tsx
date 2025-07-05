import Link from "next/link";
import { Bookmark, EditIcon, TrashIcon } from "lucide-react";
import { Chat } from "./app-sidebar";
import { groupChatsByDate } from "@/lib/chat-helpers";
import { interfaceColor } from "@/lib/theme";
import { useRTL } from "@/app/hooks/useRTL";
import { useRouter } from "next/navigation";

interface GroupedChatListProps {
  chats: Chat[];
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onUpdateSlug: (chatId: string, currentSlug: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const groupOrder = ["Today", "Yesterday", "Previous Week"];

export const GroupedChatList = ({
  chats,
  onTogglePin,
  onUpdateSlug,
  onDeleteChat,
}: GroupedChatListProps) => {
  const groupedChats = groupChatsByDate(chats);
  const router = useRouter();
  const { isRTLLanguage } = useRTL({
    selectedLanguage: null,
    nativeLanguage: null,
  });

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
          <h3
            className="sticky top-0 z-100 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs font-bold text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded uppercase tracking-wide"
            style={{ color: interfaceColor }}
          >
            {groupTitle}
          </h3>
          <ul className="space-y-0 flex flex-col">
            {groupedChats[groupTitle].map((chat: Chat) => {
              // Calculate RTL logic using consolidated function
              const isRTL =
                isRTLLanguage(chat.selectedLanguage) ||
                isRTLLanguage(chat.nativeLanguage);

              const rtlStyles: React.CSSProperties = {
                direction: isRTL ? "rtl" : "ltr",
                textAlign: isRTL ? "right" : "left",
              };

              const languageCode =
                chat.selectedLanguage || chat.nativeLanguage || undefined;

              return (
                <li
                  key={chat.chatId}
                  className="group flex items-stretch justify-between border-b border-slate-200/50 dark:border-slate-700/50 last:border-b-0 py-0.5 hover:bg-[rgba(23,6,100,0.04)] dark:hover:bg-[rgba(23,6,100,0.08)] rounded transition-all duration-200 cursor-pointer"
                >
                  <Link
                    href={`/chat/${chat.chatId}`}
                    className="flex-grow overflow-hidden pr-1 min-w-0"
                    prefetch={false}
                    onMouseEnter={() => router.prefetch(`/chat/${chat.chatId}`)}
                  >
                    <div
                      className="truncate font-medium text-sm text-slate-800 dark:text-slate-200"
                      style={rtlStyles}
                      lang={languageCode}
                    >
                      {chat.slug}
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 gap-0.5">
                      <span
                        className="font-semibold flex-shrink-0"
                        style={{ color: interfaceColor }}
                      >
                        {chat.selectedLanguageLabel}
                      </span>
                      {chat.lastMessageAt && (
                        <div className="text-right font-normal flex-shrink-0 text-xs">
                          <div className="whitespace-nowrap">
                            {new Date(chat.lastMessageAt).toLocaleDateString()}
                          </div>
                          <div className="whitespace-nowrap">
                            {new Date(chat.lastMessageAt).toLocaleTimeString(
                              [],
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
                    <button
                      title="Pin chat"
                      className="p-0.5 text-slate-400 hover:text-yellow-500 transition-colors duration-200 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      onClick={() => onTogglePin(chat.chatId, chat.isPinned)}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${chat.isPinned ? "fill-yellow-400 text-yellow-500" : ""}`}
                      />
                    </button>
                    <div className="flex">
                      <button
                        title="Edit slug"
                        className="p-0.5 text-slate-400 transition-colors duration-200 rounded"
                        style={{
                          color: "rgb(156 163 175)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = interfaceColor;
                          e.currentTarget.style.backgroundColor = `${interfaceColor}14`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgb(156 163 175)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => onUpdateSlug(chat.chatId, chat.slug)}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete chat"
                        className="p-0.5 text-slate-400 hover:text-red-600 transition-colors duration-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => onDeleteChat(chat.chatId)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
