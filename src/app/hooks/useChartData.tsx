import { useState, useEffect, useCallback } from "react";
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

interface ChartData {
  dailyData: DailyData[];
  streakData: StreakData[];
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

export function useChartData(timeRange: "7d" | "30d" | "90d") {
  const [isVisible, setIsVisible] = useState(false);

  // Use intersection observer to lazy load chart data
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    // Observe the charts container
    const chartsContainer = document.querySelector("[data-charts-container]");
    if (chartsContainer) {
      observer.observe(chartsContainer);
    }

    return () => observer.disconnect();
  }, []);

  const { data, error, isLoading } = useSWR<ChartData>(
    isVisible ? `/api/stats/charts?range=${timeRange}` : null,
    chartFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 600000, // Refresh every 10 minutes
      dedupingInterval: 120000, // Dedupe requests within 2 minutes
      errorRetryCount: 2,
      errorRetryInterval: 10000,
      keepPreviousData: true,
    }
  );

  // Generate fallback mock data if API is not available
  const generateMockData = useCallback((range: "7d" | "30d" | "90d") => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const today = new Date();

    const daily: DailyData[] = [];
    const streak: StreakData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Generate realistic but varied data
      const words =
        Math.floor(Math.random() * 15) + (Math.random() > 0.3 ? 5 : 0);
      const chats =
        Math.floor(Math.random() * 3) + (Math.random() > 0.5 ? 1 : 0);

      daily.push({ date: dateStr, words, chats });

      // Generate streak data (more realistic)
      const currentStreak = 5; // Default fallback
      const streakValue = i < currentStreak ? currentStreak - i : 0;
      streak.push({ date: dateStr, streak: streakValue });
    }

    return { dailyData: daily, streakData: streak };
  }, []);

  return {
    dailyData: data?.dailyData || generateMockData(timeRange).dailyData,
    streakData: data?.streakData || generateMockData(timeRange).streakData,
    loading: isLoading,
    error: error?.message || null,
    isVisible,
  };
}
