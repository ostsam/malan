import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

interface UserStats {
  wordCount: number;
  chatCount: number;
  streak: number;
  longestStreak: number;
  dailyGoal: number;
  todayWords: number;
  dailyProgress: number;
}

interface CachedPayload {
  data: UserStats;
  cachedAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - refresh in background if older

export function useCachedUserStats() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const cacheKey = userId ? `userStats:${userId}` : null;

  const readCache = (): UserStats | null => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed: CachedPayload = JSON.parse(raw);
      if (Date.now() - parsed.cachedAt > TTL_MS) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const [stats, setStats] = useState<UserStats | null>(readCache());
  const [loading, setLoading] = useState<boolean>(!stats);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  const fetchStats = async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (isFetching.current) return;

    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);

      // Cache the fresh data
      if (cacheKey) {
        const payload: CachedPayload = {
          data,
          cachedAt: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      }
    } catch (err) {
      console.error("Error fetching user stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const refresh = () => fetchStats(true);

  const mutate = (updater: (current: UserStats | null) => UserStats | null) => {
    const newStats = updater(stats);
    setStats(newStats);

    // Update cache with new data
    if (cacheKey && newStats) {
      const payload: CachedPayload = {
        data: newStats,
        cachedAt: Date.now(),
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    }
  };

  // Optimistic updates for common actions
  const incrementWordCount = () => {
    if (!stats) return;
    mutate((current) =>
      current
        ? {
            ...current,
            wordCount: current.wordCount + 1,
            todayWords: current.todayWords + 1,
            dailyProgress: Math.min(
              ((current.todayWords + 1) / current.dailyGoal) * 100,
              100
            ),
          }
        : null
    );
  };

  const decrementWordCount = () => {
    if (!stats) return;
    mutate((current) =>
      current
        ? {
            ...current,
            wordCount: Math.max(0, current.wordCount - 1),
            todayWords: Math.max(0, current.todayWords - 1),
            dailyProgress: Math.min(
              (Math.max(0, current.todayWords - 1) / current.dailyGoal) * 100,
              100
            ),
          }
        : null
    );
  };

  const incrementChatCount = () => {
    if (!stats) return;
    mutate((current) =>
      current
        ? {
            ...current,
            chatCount: current.chatCount + 1,
          }
        : null
    );
  };

  const decrementChatCount = () => {
    if (!stats) return;
    mutate((current) =>
      current
        ? {
            ...current,
            chatCount: Math.max(0, current.chatCount - 1),
          }
        : null
    );
  };

  const updateStreak = (newStreak: number, newLongestStreak?: number) => {
    if (!stats) return;
    mutate((current) =>
      current
        ? {
            ...current,
            streak: newStreak,
            longestStreak:
              newLongestStreak ?? Math.max(current.longestStreak, newStreak),
          }
        : null
    );
  };

  useEffect(() => {
    if (!userId || hasInitialized.current) return;
    hasInitialized.current = true;

    // Re-read cache for this user (first time session becomes available)
    const cached = readCache();
    if (cached) {
      setStats(cached);
      setLoading(false);

      // Check if cache is stale and refresh in background
      const cacheAge =
        Date.now() -
        (JSON.parse(sessionStorage.getItem(cacheKey!) || "{}").cachedAt || 0);
      if (cacheAge > STALE_THRESHOLD_MS) {
        fetchStats(); // Background refresh
      }
    } else {
      // Only fetch if cache empty
      fetchStats();
    }
  }, [userId]);

  return {
    stats,
    loading,
    error,
    refresh,
    mutate,
    incrementWordCount,
    decrementWordCount,
    incrementChatCount,
    decrementChatCount,
    updateStreak,
  } as const;
}
