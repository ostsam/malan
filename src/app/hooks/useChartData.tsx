import { useState } from "react";
import useSWR from "swr";

interface DailyData {
  date: string;
  words: number;
  chats: number;
}

interface StreakData {
  date: string;
  streak: number;
}

interface LanguageDistribution {
  lang: string;
  count: number;
}

interface ChartData {
  dailyData: DailyData[];
  streakData: StreakData[];
  languageDistribution: LanguageDistribution[];
}

// Fetcher for chart data
const chartFetcher = async (url: string): Promise<ChartData> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch chart data");
  }

  return response.json();
};

export function useChartData(timeRange: "7d" | "30d" | "90d" | "all-time") {
  // Intersection observer removed: always fetch on page load
  const { data, error, isLoading } = useSWR<ChartData>(
    `/api/stats/charts?range=${timeRange}`,
    chartFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 600000, // Refresh every 10 minutes
      dedupingInterval: 120000, // Dedupe requests within 2 minutes
      errorRetryCount: 2,
      errorRetryInterval: 10000,
      keepPreviousData: true,
    }
  );

  return {
    dailyData: data?.dailyData || [],
    streakData: data?.streakData || [],
    languageDistribution: data?.languageDistribution || [],
    loading: isLoading,
    error: error?.message || null,
    isVisible: true, // Always true now
  };
}
