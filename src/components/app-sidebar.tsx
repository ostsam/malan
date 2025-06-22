"use client";

import { Calendar, Home, LogOutIcon, Search, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
} from "@/components/ui/sidebar";


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

  // Handle chat history loading

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.chats || []);
        }
      } catch (e) {
        // Optionally handle error
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  return (
    <Sidebar side="left" collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="p-2 text-sm text-gray-500">Loading...</div>
            ) : chatHistory.length > 0 ? (
              <ul className="space-y-1">
                {chatHistory.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`/chat/${chat.id}`}
                      className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {chat.settings?.name || chat.id}
                      <span className="ml-2 text-xs text-gray-400">
                        {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}
                      </span>
                    </Link>
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
        <div className="flex justify-center w-full border-gray-200 border-t">
          <button
            onClick={async () => {
              await authClient.signOut();
              router.push('/');
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LogOutIcon className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}