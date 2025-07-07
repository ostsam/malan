import { useState, useEffect, useCallback } from "react";
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

export function useUserStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stats", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching user stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats();
    }
  }, [session?.user?.id, fetchStats]);

  const refreshStats = () => {
    fetchStats();
  };

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
}
