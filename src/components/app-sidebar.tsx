"use client";

import { Calendar, Home, LogOutIcon, PanelLeftIcon, Search, Settings, TrashIcon, EditIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { deleteChat, updateChatSlug } from '@/app/actions/chat';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogoutButton } from "./logout";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export default function AppSidebar() {
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Handle chat history loading

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history", { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.sessions || []);
        }
      } catch (e) {
        // Optionally handle error
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const res = await fetch("/api/history", { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.sessions || []);
      }
    } catch (e) {
      // Optionally handle error
    }
  };

  return (
    <>
      <SidebarTrigger />
      <Sidebar side="left" collapsible="offcanvas" className="group">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="p-2 text-sm text-gray-500">Loading...</div>
            ) : chatHistory.length > 0 ? (
              <ul className="space-y-1 flex flex-col">
                {chatHistory.map((chat) => (
                  <li
                    key={chat.chatId}
                    className={`group flex flex-row items-center justify-between border-b border-gray-200 last:border-b-0 py-1 relative`}
                  >
                    <div className="flex flex-col w-full">
                      <Link
                        href={`/chat/${chat.chatId}`}
                        className="flex flex-row items-center overflow-hidden"
                      >
                        <div className="flex-grow overflow-hidden">
                          <div className="truncate font-medium">{chat.slug}</div>
                          <div className="flex justify-between items-start text-xs text-gray-400 mt-1">
                            <span className="font-semibold">{chat.selectedLanguageLabel}</span>
                            <div className="text-right font-normal flex-shrink-0">
                              <div>{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleDateString() : ""}</div>
                              <div>{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ""}</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="flex justify-end items-center mt-auto">
                        <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                            onClick={async (e) => {
                              e.preventDefault();
                              const newSlug = prompt('Enter new slug:', chat.slug);
                              if (newSlug) {
                                try {
                                  await updateChatSlug(chat.chatId, newSlug);
                                  await fetchChatHistory();
                                } catch (error) {
                                  console.error("Failed to update slug:", error);
                                }
                              }
                            }}
                          >
                            <EditIcon className="h-4 w-4 mr-3" />
                          </button>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (confirm('Are you sure you want to delete this chat?')) {
                                try {
                                  await deleteChat(chat.chatId);
                                  await fetchChatHistory();
                                } catch (error) {
                                  console.error("Failed to delete chat:", error);
                                }
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-2 text-sm text-gray-500">No chat history.</div>
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