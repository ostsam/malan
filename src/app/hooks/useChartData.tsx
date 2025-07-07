import { useState, useEffect } from "react";
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

  return {
    dailyData: data?.dailyData || [],
    streakData: data?.streakData || [],
    languageDistribution: data?.languageDistribution || [],
    loading: isLoading,
    error: error?.message || null,
    isVisible,
  };
}
