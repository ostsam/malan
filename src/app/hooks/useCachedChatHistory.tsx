import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import type { Chat } from "@/components/app-sidebar";

interface CachedPayload {
  data: Chat[];
  cachedAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useCachedChatHistory() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const cacheKey = userId ? `chatHistory:${userId}` : null;

  const readCache = (): Chat[] => {
    if (!cacheKey) return [];
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return [];
      const parsed: CachedPayload = JSON.parse(raw);
      if (Date.now() - parsed.cachedAt > TTL_MS) {
        sessionStorage.removeItem(cacheKey);
        return [];
      }
      return parsed.data;
    } catch {
      return [];
    }
  };

  const [history, setHistory] = useState<Chat[]>(readCache());
  const [loading, setLoading] = useState<boolean>(history.length === 0);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/history", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const sessions: Chat[] = json.sessions ?? [];
        setHistory(sessions);
        if (cacheKey) {
          const payload: CachedPayload = {
            data: sessions,
            cachedAt: Date.now(),
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const persist = (data: Chat[]) => {
    setHistory(data);
    if (cacheKey) {
      const payload: CachedPayload = { data, cachedAt: Date.now() };
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {}
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Re-read cache for this user (first time session becomes available)
    const cached = readCache();
    if (cached.length) {
      setHistory(cached);
      setLoading(false);
    }

    if (cached.length === 0) {
      // Only fetch if cache empty
      refresh();
    } else {
      // Fetch in background without affecting loading state
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    history,
    loading,
    refresh,
    persist,
  } as const;
}
