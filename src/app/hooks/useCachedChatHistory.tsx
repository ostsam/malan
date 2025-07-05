import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import type { Chat } from "@/components/app-sidebar";

interface CachedPayload {
  data: Chat[];
  cachedAt: number;
  etag?: string;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function useCachedChatHistory() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const cacheKey = userId ? `chatHistory:${userId}` : null;

  const readCache = useCallback((): Chat[] => {
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
  }, [cacheKey]);

  const [history, setHistory] = useState<Chat[]>(() => readCache());
  const [loading, setLoading] = useState<boolean>(history.length === 0);
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const headers: HeadersInit = {};
      const currentEtag = cacheKey
        ? JSON.parse(sessionStorage.getItem(cacheKey) || "null")?.etag
        : undefined;
      if (currentEtag) headers["If-None-Match"] = currentEtag;

      const res = await fetch("/api/history", {
        credentials: "include",
        headers,
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
  }, [userId, cacheKey]);

  // OPTIMIZATION: Debounced refresh to prevent rapid successive calls
  const debouncedRefresh = useCallback(
    (delay: number = 1000) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        refresh();
      }, delay);
    },
    [refresh]
  );

  const persist = useCallback(
    (data: Chat[]) => {
      setHistory(data);
      if (cacheKey) {
        const payload: CachedPayload = { data, cachedAt: Date.now() };
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {}
      }
    },
    [cacheKey]
  );

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
      if (cacheAge > STALE_THRESHOLD) {
        // OPTIMIZATION: Use debounced refresh for background updates
        debouncedRefresh(2000);
      }
    } else {
      // Only fetch if cache empty
      refresh();
    }
  }, [userId, readCache, cacheKey, refresh, debouncedRefresh]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    history,
    loading,
    refresh: debouncedRefresh,
    persist,
  } as const;
}
