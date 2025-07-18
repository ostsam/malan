"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStats } from "@/app/hooks/useUserStats";
import { useChartData } from "@/app/hooks/useChartData";
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

export default function AnalyticsPage() {
  const { stats, loading: statsLoading, error: statsError } = useUserStats();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all-time">(
    "30d"
  );
  const [languageRange, setLanguageRange] = useState<"current" | "all-time">(
    "current"
  );
  // Progressive loading: only load chart data when needed
  const {
    dailyData,
    streakData,
    languageDistribution,
    loading: chartLoading,
    error,
  } = useChartData(languageRange === "all-time" ? "all-time" : timeRange);

  // Enable page scrolling (override global overflow-hidden)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflowY = "auto";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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

  // Language code to display name mapping
  const getLanguageName = (code: string) => {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
      tr: "Turkish",
      nl: "Dutch",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish",
      pl: "Polish",
      cs: "Czech",
      hu: "Hungarian",
      ro: "Romanian",
      bg: "Bulgarian",
      hr: "Croatian",
      sk: "Slovak",
      sl: "Slovenian",
      et: "Estonian",
      lv: "Latvian",
      lt: "Lithuanian",
      mt: "Maltese",
      el: "Greek",
      he: "Hebrew",
      th: "Thai",
      vi: "Vietnamese",
      id: "Indonesian",
      ms: "Malay",
      fil: "Filipino",
      sw: "Swahili",
      am: "Amharic",
      bn: "Bengali",
      ur: "Urdu",
      fa: "Persian",
      ne: "Nepali",
      si: "Sinhala",
      my: "Burmese",
      km: "Khmer",
      lo: "Lao",
      mn: "Mongolian",
      ka: "Georgian",
      hy: "Armenian",
      az: "Azerbaijani",
      kk: "Kazakh",
      ky: "Kyrgyz",
      uz: "Uzbek",
      tg: "Tajik",
      ps: "Pashto",
      ku: "Kurdish",
      sd: "Sindhi",
      gu: "Gujarati",
      pa: "Punjabi",
      or: "Odia",
      ta: "Tamil",
      te: "Telugu",
      kn: "Kannada",
      ml: "Malayalam",
      as: "Assamese",
      mr: "Marathi",
      sa: "Sanskrit",
      bo: "Tibetan",
      dz: "Dzongkha",
      ug: "Uyghur",
      yi: "Yiddish",
      gd: "Scottish Gaelic",
      cy: "Welsh",
      br: "Breton",
      ga: "Irish",
      is: "Icelandic",
      fo: "Faroese",
      sq: "Albanian",
      mk: "Macedonian",
      sr: "Serbian",
      bs: "Bosnian",
      me: "Montenegrin",
      sh: "Serbo-Croatian",
      uk: "Ukrainian",
      be: "Belarusian",
    };
    return languageNames[code] || code.toUpperCase();
  };

  // Generate pie chart data from language distribution
  const pieData =
    languageDistribution?.map((item, index) => {
      const colors = [
        chartColors.primary,
        chartColors.secondary,
        chartColors.accent,
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#8B5CF6", // Purple
        "#06B6D4", // Cyan
        "#84CC16", // Lime
        "#F97316", // Orange
        "#EC4899", // Pink
      ];

      return {
        name: getLanguageName(item.lang),
        value: Number(item.count) || 0,
        color: colors[index % colors.length],
      };
    }) || [];

  // Show loading state only for initial stats load
  if (statsLoading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-slate-500">
        Loading analytics...
      </div>
    );
  }

  // Show error state for stats or chart data
  if (statsError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-red-600">
        Failed to load analytics: {statsError || error}
      </div>
    );
  }

  // Show empty state if all chart data is empty
  if (
    (!dailyData || dailyData.length === 0) &&
    (!streakData || streakData.length === 0) &&
    (!languageDistribution || languageDistribution.length === 0)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-slate-500">
        No analytics data available for this range.
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
                    {stats?.wordCount ?? 0}
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
                    {stats?.chatCount ?? 0}
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
                    {stats?.streak ?? 0} days
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
                    {stats?.todayWords ?? 0}/{stats?.dailyGoal ?? 0}
                  </p>
                </div>
                <Target className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#3C18D9] dark:text-[#8B5CF6] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts - Progressive Loading */}
        <div data-charts-container>
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
                        setTimeRange(
                          e.target.value as "7d" | "30d" | "90d" | "all-time"
                        )
                      }
                      className="px-3 py-2 glassmorphic text-sm focus:border-[#3C18D9] dark:focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#3C18D9]/20 dark:focus:ring-[#8B5CF6]/20 transition-all duration-300"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="all-time">All Time</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartLoading ? (
                    <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse flex items-center justify-center">
                      <div className="text-slate-500">
                        Loading chart data...
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                  {chartLoading ? (
                    <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse flex items-center justify-center">
                      <div className="text-slate-500">
                        Loading streak data...
                      </div>
                    </div>
                  ) : (
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
                          dot={{
                            fill: chartColors.primary,
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{
                            r: 6,
                            stroke: chartColors.primary,
                            strokeWidth: 2,
                          }}
                          name="Streak Days"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glassmorphic">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-[#3C18D9] dark:text-[#8B5CF6]">
                        <Award className="h-5 w-5" />
                        Learning Distribution
                      </CardTitle>
                      <select
                        value={languageRange}
                        onChange={(e) =>
                          setLanguageRange(
                            e.target.value as "current" | "all-time"
                          )
                        }
                        className="px-3 py-2 glassmorphic text-sm focus:border-[#3C18D9] dark:focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#3C18D9]/20 dark:focus:ring-[#8B5CF6]/20 transition-all duration-300"
                      >
                        <option value="current">Current Range</option>
                        <option value="all-time">All Time</option>
                      </select>
                    </div>
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
                          {stats?.longestStreak ?? 0} days
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Daily Goal
                        </span>
                        <span className="text-lg font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                          {stats?.dailyGoal ?? 0} words
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Today&apos;s Progress
                        </span>
                        <span className="text-lg font-bold text-[#3C18D9] dark:text-[#8B5CF6]">
                          {Math.round(stats?.dailyProgress ?? 0)}%
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
    </div>
  );
}
