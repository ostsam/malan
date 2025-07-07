"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStats } from "@/app/hooks/useUserStats";
import { interfaceColor } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Flame,
  BookOpen,
  Target,
  Calendar,
  Activity,
  Award,
} from "lucide-react";

interface DailyData {
  date: string;
  words: number;
  chats: number;
}

interface StreakData {
  date: string;
  streak: number;
}

export default function AnalyticsPage() {
  const { stats, loading, error } = useUserStats();
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Enable page scrolling (override global overflow-hidden)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflowY = "auto";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Generate mock data for demonstration (in real app, this would come from API)
  useEffect(() => {
    const generateMockData = () => {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
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
        const currentStreak = stats?.streak || 0;
        const streakValue = i < currentStreak ? currentStreak - i : 0;
        streak.push({ date: dateStr, streak: streakValue });
      }

      setDailyData(daily);
      setStreakData(streak);
    };

    if (stats) {
      generateMockData();
    }
  }, [stats, timeRange]);

  // Helper to create a lighter version of interfaceColor
  function lightenColor(hex: string, percent: number) {
    // Remove # if present
    hex = hex.replace(/^#/, "");
    // Parse r, g, b
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    // Blend with white
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  const lighterInterfaceColor = lightenColor(interfaceColor, 0.5); // 50% lighter

  const chartColors = {
    primary: interfaceColor,
    secondary: lighterInterfaceColor,
    accent: "#10B981",
    background: "#F8FAFC",
  };

  const pieData = [
    {
      name: "Words Saved",
      value: stats?.wordCount || 0,
      color: chartColors.primary,
    },
    {
      name: "Chat Sessions",
      value: stats?.chatCount || 0,
      color: chartColors.secondary,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ overflowY: "auto" }}>
        {/* Background gradient effects matching Malan theme */}
        <div className="fixed inset-0 -z-20 flex items-center justify-center">
          <div
            className="w-[1600px] h-[1600px] rounded-full blur-[160px] opacity-60 animate-[spin-slow_45s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from_180deg_at_50%_50%,rgba(23,6,100,0.85)_0%,rgba(35,12,120,0.75)_25%,rgba(55,20,140,0.65)_50%,rgba(75,30,160,0.6)_75%,rgba(23,6,100,0.85)_100%)",
            }}
          />
        </div>

        {/* Radial burst effects */}
        <div className="fixed -top-32 -left-48 -z-10">
          <div
            className="w-[650px] h-[650px] rounded-full blur-[90px] opacity-55 animate-[pulse-float_12s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%,rgba(23,6,100,0.85) 0%,rgba(23,6,100,0) 70%)",
            }}
          />
        </div>

        <div className="fixed bottom-0 right-0 -z-10">
          <div
            className="w-[600px] h-[600px] rounded-full blur-[90px] opacity-50 animate-[pulse-float_14s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 70% 70%,rgba(55,20,140,0.75) 0%,rgba(55,20,140,0) 70%)",
              animationDelay: "2s",
            }}
          />
        </div>

        {/* Fine noise overlay */}
        <div
          className="fixed inset-0 -z-10 mix-blend-multiply opacity-[0.22]"
          style={{
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22%3E%3Crect width=%22160%22 height=%22160%22 fill=%22%23FFFFFF%22/%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%22120%22 cy=%22120%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3C/svg%3E')",
          }}
        />

        <div className="container mx-auto max-w-6xl p-6 relative z-10">
          {/* Header */}
          <div className="mb-8">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-slate-200/50 dark:border-slate-600/50 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-500 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            {/* Title with Malan logo styling */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3C18D9] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3C18D9] to-[#8B5CF6] bg-clip-text text-transparent">
                  Learning Analytics
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Track your language learning progress and achievements with
                detailed insights into your daily activity, streaks, and
                learning patterns.
              </p>
            </div>
          </div>

          {/* Loading skeleton with fade-in animation */}
          <div className="animate-in fade-in-0 duration-500">
            {/* Quick Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card
                  key={i}
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-xl animate-in fade-in-0 duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
                      </div>
                      <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Skeleton */}
            <Tabs defaultValue="activity" className="space-y-6">
              <TabsList
                className="grid w-full grid-cols-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-lg rounded-xl overflow-hidden animate-in fade-in-0 duration-500"
                style={{ animationDelay: "400ms" }}
              >
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Daily Activity
                </TabsTrigger>
                <TabsTrigger
                  value="streak"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Streak History
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Overview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-6">
                <Card
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-xl animate-in fade-in-0 duration-500"
                  style={{ animationDelay: "500ms" }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                        <TrendingUp className="h-5 w-5" />
                        Daily Learning Activity
                      </CardTitle>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen relative" style={{ overflowY: "auto" }}>
        {/* Background gradient effects matching Malan theme */}
        <div className="fixed inset-0 -z-20 flex items-center justify-center">
          <div
            className="w-[1600px] h-[1600px] rounded-full blur-[160px] opacity-60 animate-[spin-slow_45s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from_180deg_at_50%_50%,rgba(23,6,100,0.85)_0%,rgba(35,12,120,0.75)_25%,rgba(55,20,140,0.65)_50%,rgba(75,30,160,0.6)_75%,rgba(23,6,100,0.85)_100%)",
            }}
          />
        </div>

        {/* Radial burst effects */}
        <div className="fixed -top-32 -left-48 -z-10">
          <div
            className="w-[650px] h-[650px] rounded-full blur-[90px] opacity-55 animate-[pulse-float_12s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%,rgba(23,6,100,0.85) 0%,rgba(23,6,100,0) 70%)",
            }}
          />
        </div>

        <div className="fixed bottom-0 right-0 -z-10">
          <div
            className="w-[600px] h-[600px] rounded-full blur-[90px] opacity-50 animate-[pulse-float_14s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 70% 70%,rgba(55,20,140,0.75) 0%,rgba(55,20,140,0) 70%)",
              animationDelay: "2s",
            }}
          />
        </div>

        {/* Fine noise overlay */}
        <div
          className="fixed inset-0 -z-10 mix-blend-multiply opacity-[0.22]"
          style={{
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22%3E%3Crect width=%22160%22 height=%22160%22 fill=%22%23FFFFFF%22/%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%22120%22 cy=%22120%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3C/svg%3E')",
          }}
        />

        <div className="container mx-auto max-w-6xl p-6 relative z-10">
          {/* Header */}
          <div className="mb-8">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-slate-200/50 dark:border-slate-600/50 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-500 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            {/* Title with Malan logo styling */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3C18D9] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3C18D9] to-[#8B5CF6] bg-clip-text text-transparent">
                  Learning Analytics
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Track your language learning progress and achievements with
                detailed insights into your daily activity, streaks, and
                learning patterns.
              </p>
            </div>
          </div>

          {/* Silent error state - just show loading skeleton */}
          <div className="animate-in fade-in-0 duration-500">
            {/* Quick Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card
                  key={i}
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-xl animate-in fade-in-0 duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
                      </div>
                      <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Skeleton */}
            <Tabs defaultValue="activity" className="space-y-6">
              <TabsList
                className="grid w-full grid-cols-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-lg rounded-xl overflow-hidden animate-in fade-in-0 duration-500"
                style={{ animationDelay: "400ms" }}
              >
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Daily Activity
                </TabsTrigger>
                <TabsTrigger
                  value="streak"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Streak History
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Overview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-6">
                <Card
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-700/40 shadow-xl animate-in fade-in-0 duration-500"
                  style={{ animationDelay: "500ms" }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                        <TrendingUp className="h-5 w-5" />
                        Daily Learning Activity
                      </CardTitle>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ overflowY: "auto" }}>
      {/* Background gradient effects matching Malan theme */}
      <div className="fixed inset-0 -z-20 flex items-center justify-center">
        <div
          className="w-[1600px] h-[1600px] rounded-full blur-[160px] opacity-60 animate-[spin-slow_45s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from_180deg_at_50%_50%,rgba(23,6,100,0.85)_0%,rgba(35,12,120,0.75)_25%,rgba(55,20,140,0.65)_50%,rgba(75,30,160,0.6)_75%,rgba(23,6,100,0.85)_100%)",
          }}
        />
      </div>

      {/* Radial burst effects */}
      <div className="fixed -top-32 -left-48 -z-10">
        <div
          className="w-[650px] h-[650px] rounded-full blur-[90px] opacity-55 animate-[pulse-float_12s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%,rgba(23,6,100,0.85) 0%,rgba(23,6,100,0) 70%)",
          }}
        />
      </div>

      <div className="fixed bottom-0 right-0 -z-10">
        <div
          className="w-[600px] h-[600px] rounded-full blur-[90px] opacity-50 animate-[pulse-float_14s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle at 70% 70%,rgba(55,20,140,0.75) 0%,rgba(55,20,140,0) 70%)",
            animationDelay: "2s",
          }}
        />
      </div>

      {/* Fine noise overlay */}
      <div
        className="fixed inset-0 -z-10 mix-blend-multiply opacity-[0.22]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22%3E%3Crect width=%22160%22 height=%22160%22 fill=%22%23FFFFFF%22/%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%22120%22 cy=%22120%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3C/svg%3E')",
        }}
      />

      <div className="container mx-auto max-w-6xl p-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 glassmorphic border-2 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Title with Malan logo styling */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 glassmorphic flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-[#3C18D9] dark:text-[#8B5CF6]" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3C18D9] to-[#8B5CF6] bg-clip-text text-transparent">
                Learning Analytics
              </h1>
            </div>
            <p className="text-slate-800 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Track your language learning progress and achievements with
              detailed insights into your daily activity, streaks, and learning
              patterns.
            </p>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 animate-in fade-in-0 duration-500">
          <Card className="glassmorphic hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#3C18D9] dark:text-[#8B5CF6]">
                    Total Words
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                    {stats.wordCount}
                  </p>
                </div>
                <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#3C18D9] dark:text-[#8B5CF6] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphic hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#3C18D9] dark:text-[#8B5CF6]">
                    Chat Sessions
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                    {stats.chatCount}
                  </p>
                </div>
                <Activity className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#3C18D9] dark:text-[#8B5CF6] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphic hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#3C18D9] dark:text-[#8B5CF6]">
                    Current Streak
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                    {stats.streak} days
                  </p>
                </div>
                <Flame className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#3C18D9] dark:text-[#8B5CF6] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphic hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#3C18D9] dark:text-[#8B5CF6]">
                    Today&apos;s Progress
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                    {stats.todayWords}/{stats.dailyGoal}
                  </p>
                </div>
                <Target className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#3C18D9] dark:text-[#8B5CF6] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs
          defaultValue="activity"
          className="space-y-6 animate-in fade-in-0 duration-500"
          style={{ animationDelay: "200ms" }}
        >
          <TabsList className="grid w-full grid-cols-3 glassmorphic rounded-xl overflow-hidden">
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Daily Activity
            </TabsTrigger>
            <TabsTrigger
              value="streak"
              className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Streak History
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#3C18D9] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <Card className="glassmorphic">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                    <TrendingUp className="h-5 w-5" />
                    Daily Learning Activity
                  </CardTitle>
                  <select
                    value={timeRange}
                    onChange={(e) =>
                      setTimeRange(e.target.value as "7d" | "30d" | "90d")
                    }
                    className="px-3 py-2 glassmorphic text-sm focus:border-[#3C18D9] dark:focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#3C18D9]/20 dark:focus:ring-[#8B5CF6]/20 transition-all duration-300"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="words"
                      fill={chartColors.primary}
                      radius={[4, 4, 0, 0]}
                      name="Words Saved"
                    />
                    <Bar
                      dataKey="chats"
                      fill={chartColors.secondary}
                      radius={[4, 4, 0, 0]}
                      name="Chat Sessions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streak" className="space-y-6">
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                  <Flame className="h-5 w-5" />
                  Streak History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={streakData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="streak"
                      stroke={chartColors.primary}
                      strokeWidth={3}
                      dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                      activeDot={{
                        r: 6,
                        stroke: chartColors.primary,
                        strokeWidth: 2,
                      }}
                      name="Streak Days"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glassmorphic">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                    <Award className="h-5 w-5" />
                    Learning Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-6">
                    {pieData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 glassmorphic px-3 py-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphic">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                    <Calendar className="h-5 w-5" />
                    Achievement Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Best Streak
                      </span>
                      <span className="text-lg font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                        {stats.longestStreak} days
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Daily Goal
                      </span>
                      <span className="text-lg font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                        {stats.dailyGoal} words
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Today&apos;s Progress
                      </span>
                      <span className="text-lg font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                        {Math.round(stats.dailyProgress)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
