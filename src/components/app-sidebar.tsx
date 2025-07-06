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
import { QuickStats, UserStats } from "@/components/QuickStats";
import { AppSidebarSkeleton } from "@/components/app-sidebar-skeleton";

export interface Chat {
  chatId: string;
  slug: string;
  selectedLanguageLabel: string;
  selectedLanguage?: string;
  nativeLanguage?: string;
  lastMessageAt: string | null;
  isPinned: boolean;
}

export default function AppSidebar() {
  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isRTLLanguage } = useRTL({
    selectedLanguage: null,
    nativeLanguage: null,
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/history", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to load chat history")
      ),
      fetch("/api/profile", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to load profile")
      ),
      fetch("/api/stats", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to load stats")
      ),
    ])
      .then(([historyData, profileData, statsData]) => {
        if (!isMounted) return;
        setChatHistory(historyData.sessions || []);
        setUserProfile(profileData.profile || null);
        setStats(statsData || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(typeof err === "string" ? err : "Failed to load sidebar data");
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
            className="group flex items-stretch justify-between border-b border-slate-300/60 dark:border-slate-600/60 last:border-b-0 py-1.5 hover:bg-[rgba(23,6,100,0.06)] dark:hover:bg-[rgba(23,6,100,0.12)] rounded-none transition-all duration-300 cursor-pointer mx-1"
          >
            <Link
              href={`/chat/${chat.chatId}`}
              className="flex-grow overflow-hidden pr-0.5 min-w-0"
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
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 gap-2">
                <span
                  className="font-semibold flex-shrink-0 px-2 py-0.5 rounded-full text-xs"
                  style={{
                    color: interfaceColor,
                    backgroundColor: `${interfaceColor}15`,
                  }}
                >
                  {chat.selectedLanguageLabel}
                </span>
                {chat.lastMessageAt && (
                  <div className="text-right font-normal flex-shrink-0 text-xs min-w-0">
                    <div className="whitespace-nowrap text-[10px] leading-tight">
                      {new Date(chat.lastMessageAt).toLocaleDateString()}
                    </div>
                    <div className="whitespace-nowrap text-[10px] leading-tight">
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
                className="p-0.5 text-slate-400 hover:text-yellow-500 transition-all duration-300 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:scale-105"
                onClick={() => handleTogglePin(chat.chatId, chat.isPinned)}
              >
                <Bookmark
                  className={`h-4 w-4 ${chat.isPinned ? "fill-yellow-400 text-yellow-500" : ""}`}
                />
              </button>
              <div className="flex gap-0.5">
                <button
                  title="Edit slug"
                  className="p-0.5 text-slate-400 transition-all duration-300 rounded-lg hover:scale-105"
                  style={{
                    color: "rgb(156 163 175)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = interfaceColor;
                    e.currentTarget.style.backgroundColor = `${interfaceColor}15`;
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
                  className="p-0.5 text-slate-400 hover:text-red-600 transition-all duration-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105"
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

  if (loading) {
    return <AppSidebarSkeleton />;
  }
  if (error) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
        {error}
      </div>
    );
  }
  if (!stats) {
    return <AppSidebarSkeleton />;
  }

  return (
    <>
      <SidebarTrigger />
      <Sidebar
        side="left"
        collapsible="offcanvas"
        className="group animate-in fade-in-0 duration-150"
      >
        <SidebarContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/40 dark:border-slate-700/40 shadow-xl">
          {/* Quick Stats Header */}
          <QuickStats stats={stats} />

          <SidebarGroup>
            <SidebarGroupContent className="p-0.5">
              {chatHistory.length > 0 ? (
                <>
                  {pinnedChats.length > 0 && (
                    <div className="mb-4">
                      <SidebarGroupLabel
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 px-2"
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
                <div className="p-4 text-sm text-center text-slate-500 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
                  No chat history.
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-xl">
          <div className="p-0.5">
            {/* User Profile Section - Maintains original dimensions */}
            <div className="flex items-center justify-between w-full">
              {!userProfile ? (
                // Compact loading skeleton that matches original dimensions
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 ring-2 ring-slate-200/50 dark:ring-slate-700/50">
                      <AvatarImage
                        src={userProfile.image}
                        alt={userProfile.name}
                      />
                      <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800">
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
                        className="h-9 w-9 p-0 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-lg transition-all duration-300 hover:scale-105"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-56 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-xl"
                      align="end"
                      side="top"
                      sideOffset={8}
                    >
                      <div className="flex flex-col gap-1">
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 rounded-lg transition-all duration-300"
                          onClick={() => setMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                        <div className="border-t border-slate-200/50 dark:border-slate-700/50 my-1" />
                        <button
                          className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 w-full text-left"
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
                </>
              )}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
