import { useCachedUserStats } from "./useCachedUserStats";

// Re-export the interface for backward compatibility
export interface UserStats {
  wordCount: number;
  chatCount: number;
  streak: number;
  longestStreak: number;
  dailyGoal: number;
  todayWords: number;
  dailyProgress: number;
}

// Delegate to the cached version while maintaining the same API
export function useUserStats() {
  const cached = useCachedUserStats();

  return {
    stats: cached.stats,
    loading: cached.loading,
    error: cached.error,
    refreshStats: cached.refresh,
  };
}
