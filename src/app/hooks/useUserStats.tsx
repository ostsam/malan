import useSWR from "swr";
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

// Fetcher function for SWR
const fetcher = async (url: string): Promise<UserStats> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }

  return response.json();
};

export function useUserStats() {
  const { data: session } = useSession();

  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<UserStats>(session?.user?.id ? "/api/stats" : null, fetcher, {
    // Optimize for analytics page usage
    revalidateOnFocus: false, // Don't refetch when window gains focus
    revalidateOnReconnect: true, // Refetch when network reconnects
    refreshInterval: 300000, // Refresh every 5 minutes
    dedupingInterval: 60000, // Dedupe requests within 1 minute
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    // Keep data fresh for analytics
    keepPreviousData: true,
  });

  return {
    stats: stats || null,
    loading: isLoading,
    error: error?.message || null,
    refreshStats: mutate,
  };
}
