"use client";

import {
  Bookmark,
  EditIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteChat, updateChatSlug, togglePinStatus } from '@/app/actions/chat';
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

interface Chat {
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
      const res = await fetch("/api/history", { credentials: 'include' });
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
    const updatedChatHistory = chatHistory.map(chat =>
      chat.chatId === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    );
    setChatHistory(updatedChatHistory);
    toast.success(isPinned ? 'Chat unpinned!' : 'Chat pinned!');

    try {
      await togglePinStatus(chatId);
    } catch (error) {
      console.error('Failed to toggle pin status:', error);
      setChatHistory(originalChatHistory);
      toast.error('Failed to update pin status. Please try again.');
    }
  };

  const handleUpdateSlug = async (chatId: string, currentSlug: string) => {
    const newSlug = prompt('Enter new slug:', currentSlug);
    if (newSlug && newSlug !== currentSlug) {
      const originalChatHistory = [...chatHistory];
      const updatedChatHistory = chatHistory.map(chat =>
        chat.chatId === chatId ? { ...chat, slug: newSlug } : chat
      );
      setChatHistory(updatedChatHistory);
      toast.success('Slug updated successfully!');

      try {
        await updateChatSlug(chatId, newSlug);
      } catch (error) {
        console.error('Failed to update slug:', error);
        setChatHistory(originalChatHistory);
        toast.error('Failed to update slug. Please try again.');
      }
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      const originalChatHistory = [...chatHistory];
      const updatedChatHistory = chatHistory.filter(chat => chat.chatId !== chatId);
      setChatHistory(updatedChatHistory);
      toast.success('Chat deleted successfully!');

      try {
        await deleteChat(chatId);
      } catch (error) {
        console.error('Failed to delete chat:', error);
        setChatHistory(originalChatHistory);
        toast.error('Failed to delete chat. Please try again.');
      }
    }
  };

  const pinnedChats = chatHistory.filter(chat => chat.isPinned);
  const recentChats = chatHistory.filter(chat => !chat.isPinned);

  const renderChatList = (chats: Chat[]) => (
    <ul className="space-y-1 flex flex-col">
      {chats.map((chat) => (
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
          <div className="flex flex-col justify-between items-end shrink-0 pl-1">
            <button
              title="Pin chat"
              className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
              onClick={() => handleTogglePin(chat.chatId, chat.isPinned)}
            >
              <Bookmark className={`h-4 w-4 ${chat.isPinned ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400'}`} />
            </button>
            <div className="flex">
                <button
                  title="Edit slug"
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  onClick={() => handleUpdateSlug(chat.chatId, chat.slug)}
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  title="Delete chat"
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {loading ? (
                <div className="p-4 text-sm text-center text-gray-500">Loading history...</div>
              ) : chatHistory.length > 0 ? (
                <>
                  {pinnedChats.length > 0 && (
                    <div className="mb-4">
                      <SidebarGroupLabel>Bookmarked</SidebarGroupLabel>
                      {renderChatList(pinnedChats)}
                    </div>
                  )}
                  <SidebarGroupLabel>Recent</SidebarGroupLabel>
                  {renderChatList(recentChats)}
                </>
              ) : (
                <div className="p-4 text-sm text-center text-gray-500">No chat history.</div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}