import { useEffect, useState, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import type { Chat } from "@/components/app-sidebar";

interface CachedPayload {
  data: Chat[];
  cachedAt: number;
  etag?: string;
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
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  const refresh = async () => {
    if (!userId) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    console.log(
      `[CLIENT_HOOK:useCachedChatHistory] Fetching chat history for user: ${userId}`
    );

    try {
      const headers: HeadersInit = {};
      const currentEtag = cacheKey
        ? JSON.parse(sessionStorage.getItem(cacheKey) || "null")?.etag
        : undefined;
      if (currentEtag) headers["If-None-Match"] = currentEtag;

      const res = await fetch("/api/history", {
        credentials: "include",
        headers,
        // Add a unique timestamp to prevent browser caching
        cache: "no-store",
      });

      if (res.status === 304) {
        setLoading(false);
        return;
      }

      if (res.ok) {
        const json = await res.json();
        const sessions: Chat[] = json.sessions ?? [];
        const etag = res.headers.get("etag") || undefined;
        setHistory(sessions);
        if (cacheKey) {
          const payload: CachedPayload = {
            data: sessions,
            cachedAt: Date.now(),
            etag,
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        }
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
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
    if (!userId || hasInitialized.current) return;
    hasInitialized.current = true;

    // Re-read cache for this user (first time session becomes available)
    const cached = readCache();
    if (cached.length) {
      setHistory(cached);
      setLoading(false);
      // Only refresh in background if cache is stale (older than 5 minutes)
      const cacheAge =
        Date.now() -
        (JSON.parse(sessionStorage.getItem(cacheKey!) || "{}").cachedAt || 0);
      if (cacheAge > 5 * 60 * 1000) {
        refresh();
      }
    } else {
      // Only fetch if cache empty
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
