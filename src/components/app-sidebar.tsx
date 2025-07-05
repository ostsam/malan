"use client";

import {
  Bookmark,
  EditIcon,
  TrashIcon,
  BookOpen,
  MoreVertical,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GroupedChatList } from "./grouped-chat-list";
import { interfaceColor } from "@/lib/theme";
import { useRTL } from "@/app/hooks/useRTL";
import { signOut } from "@/lib/auth-client";

export interface Chat {
  chatId: string;
  slug: string;
  selectedLanguageLabel: string;
  selectedLanguage?: string;
  nativeLanguage?: string;
  lastMessageAt: string | null;
  isPinned: boolean;
}

export default function AppSidebar({
  initialChatHistory,
}: {
  initialChatHistory?: Chat[];
}) {
  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<Chat[]>(
    initialChatHistory ?? []
  );
  const [loading, setLoading] = useState(initialChatHistory ? false : true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isRTLLanguage } = useRTL({
    selectedLanguage: null,
    nativeLanguage: null,
  });

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

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
    }
  };

  useEffect(() => {
    if (initialChatHistory) return; // Skip fetch if data already provided by server
    fetchChatHistory();
    fetchUserProfile();
  }, [initialChatHistory]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderChatList = (chats: Chat[]) => (
    <ul className="space-y-0 flex flex-col">
      {chats.map((chat) => {
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
        );
      })}
    </ul>
  );

  return (
    <>
      <SidebarTrigger />
      <Sidebar side="left" collapsible="offcanvas" className="group">
        <SidebarContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50">
          <SidebarGroup>
            <SidebarGroupContent className="p-1">
              {loading ? (
                <div className="p-1 text-sm text-center text-slate-500">
                  Loading history...
                </div>
              ) : chatHistory.length > 0 ? (
                <>
                  {pinnedChats.length > 0 && (
                    <div className="mb-2">
                      <SidebarGroupLabel
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 px-1"
                        style={{ color: interfaceColor }}
                      >
                        Bookmarked
                      </SidebarGroupLabel>
                      {renderChatList(pinnedChats)}
                    </div>
                  )}
                  <div>
                    <GroupedChatList
                      chats={recentChats}
                      onTogglePin={handleTogglePin}
                      onUpdateSlug={handleUpdateSlug}
                      onDeleteChat={handleDeleteChat}
                    />
                  </div>
                </>
              ) : (
                <div className="p-1 text-sm text-center text-slate-500">
                  No chat history.
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t-2 border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-xl">
          <div className="p-1.5">
            {/* User Profile Section - Replaces the old sign out button */}
            {userProfile && (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={userProfile.image}
                      alt={userProfile.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(userProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {userProfile.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userProfile.email}
                    </div>
                  </div>
                </div>

                {/* Three-dot menu button */}
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-50 p-1.5"
                    align="end"
                    side="top"
                    sideOffset={8}
                  >
                    <div className="flex flex-col gap-1">
                      <Link
                        href="/wordlist"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors duration-200"
                        onClick={() => setMenuOpen(false)}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Wordlist</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors duration-200"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                      <button
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200 w-full text-left"
                        onClick={() => {
                          setMenuOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
