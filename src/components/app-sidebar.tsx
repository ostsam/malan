"use client";

import { Bookmark, EditIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteChat,
  updateChatSlug,
  togglePinStatus,
} from "@/app/actions/chat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogoutButton } from "./logout";
import { GroupedChatList } from "./grouped-chat-list";

export interface Chat {
  chatId: string;
  slug: string;
  selectedLanguageLabel: string;
  lastMessageAt: string | null;
  isPinned: boolean;
}

export default function AppSidebar() {
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.sessions || []);
      } else {
        setChatHistory([]);
      }
    } catch (e) {
      console.error("Failed to fetch chat history:", e);
      setChatHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const handleTogglePin = async (chatId: string, isPinned: boolean) => {
    const originalChatHistory = [...chatHistory];
    const updatedChatHistory = chatHistory.map((chat) =>
      chat.chatId === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    );
    setChatHistory(updatedChatHistory);
    toast.success(isPinned ? "Chat unpinned!" : "Chat pinned!");

    try {
      await togglePinStatus(chatId);
    } catch (error) {
      console.error("Failed to toggle pin status:", error);
      setChatHistory(originalChatHistory);
      toast.error("Failed to update pin status. Please try again.");
    }
  };

  const handleUpdateSlug = async (chatId: string, currentSlug: string) => {
    const newSlug = prompt("Enter new slug:", currentSlug);
    if (newSlug && newSlug !== currentSlug) {
      const originalChatHistory = [...chatHistory];
      const updatedChatHistory = chatHistory.map((chat) =>
        chat.chatId === chatId ? { ...chat, slug: newSlug } : chat
      );
      setChatHistory(updatedChatHistory);
      toast.success("Slug updated successfully!");

      try {
        await updateChatSlug(chatId, newSlug);
      } catch (error) {
        console.error("Failed to update slug:", error);
        setChatHistory(originalChatHistory);
        toast.error("Failed to update slug. Please try again.");
      }
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (confirm("Are you sure you want to delete this chat?")) {
      const originalChatHistory = [...chatHistory];
      const updatedChatHistory = chatHistory.filter(
        (chat) => chat.chatId !== chatId
      );
      setChatHistory(updatedChatHistory);
      toast.success("Chat deleted successfully!");

      try {
        await deleteChat(chatId);
      } catch (error) {
        console.error("Failed to delete chat:", error);
        setChatHistory(originalChatHistory);
        toast.error("Failed to delete chat. Please try again.");
      }
    }
  };

  const pinnedChats = chatHistory.filter((chat) => chat.isPinned);
  const recentChats = chatHistory.filter((chat) => !chat.isPinned);

  const renderChatList = (chats: Chat[]) => (
    <ul className="space-y-0 flex flex-col">
      {chats.map((chat) => (
        <li
          key={chat.chatId}
          className="group flex items-stretch justify-between border-b border-slate-200/50 dark:border-slate-700/50 last:border-b-0 py-0.5 hover:bg-[rgba(13,139,255,0.08)] dark:hover:bg-[rgba(13,139,255,0.15)] rounded transition-all duration-200 cursor-pointer"
        >
          <Link
            href={`/chat/${chat.chatId}`}
            className="flex-grow overflow-hidden pr-1 min-w-0"
          >
            <div className="truncate font-medium text-sm text-slate-800 dark:text-slate-200">
              {chat.slug}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 gap-0.5">
              <span
                className="font-semibold flex-shrink-0"
                style={{ color: "#0d8bff" }}
              >
                {chat.selectedLanguageLabel}
              </span>
              {chat.lastMessageAt && (
                <div className="text-right font-normal flex-shrink-0 text-xs">
                  <div className="whitespace-nowrap">
                    {new Date(chat.lastMessageAt).toLocaleDateString()}
                  </div>
                  <div className="whitespace-nowrap">
                    {new Date(chat.lastMessageAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </div>
          </Link>
          <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
            <button
              title="Pin chat"
              className="p-0.5 text-slate-400 hover:text-yellow-500 transition-colors duration-200 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              onClick={() => handleTogglePin(chat.chatId, chat.isPinned)}
            >
              <Bookmark
                className={`h-4 w-4 ${chat.isPinned ? "fill-yellow-400 text-yellow-500" : ""}`}
              />
            </button>
            <div className="flex">
              <button
                title="Edit slug"
                className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors duration-200 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => handleUpdateSlug(chat.chatId, chat.slug)}
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <button
                title="Delete chat"
                className="p-0.5 text-slate-400 hover:text-red-600 transition-colors duration-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDeleteChat(chat.chatId)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <SidebarTrigger />
      <Sidebar side="left" collapsible="offcanvas" className="group">
        <style jsx>{`
          @keyframes fadeIn {
            0% {
              opacity: 0;
              transform: translateY(24px) scale(0.98);
              filter: blur(4px);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }
          .fade-in {
            animation: fadeIn 0.2s forwards;
          }
          .delay-1 {
            animation-delay: 0.05s;
          }
          .delay-2 {
            animation-delay: 0.1s;
          }
          .delay-3 {
            animation-delay: 0.15s;
          }
        `}</style>

        <SidebarContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50">
          <SidebarGroup>
            <SidebarGroupContent className="p-1">
              {loading ? (
                <div className="p-1 text-sm text-center text-slate-500 fade-in">
                  Loading history...
                </div>
              ) : chatHistory.length > 0 ? (
                <>
                  {pinnedChats.length > 0 && (
                    <div className="mb-2 fade-in delay-1">
                      <SidebarGroupLabel
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 px-1"
                        style={{ color: "#0d8bff" }}
                      >
                        Bookmarked
                      </SidebarGroupLabel>
                      {renderChatList(pinnedChats)}
                    </div>
                  )}
                  <div className="fade-in delay-2">
                    <GroupedChatList
                      chats={recentChats}
                      onTogglePin={handleTogglePin}
                      onUpdateSlug={handleUpdateSlug}
                      onDeleteChat={handleDeleteChat}
                    />
                  </div>
                </>
              ) : (
                <div className="p-1 text-sm text-center text-slate-500 fade-in">
                  No chat history.
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-xl">
          <div className="fade-in delay-3">
            <LogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
