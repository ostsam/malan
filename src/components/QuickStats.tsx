"use client";

import { useUserStats } from "@/app/hooks/useUserStats";
import { BookOpen, MessageCircle, Flame, Target } from "lucide-react";
import { interfaceColor } from "@/lib/theme";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function QuickStats() {
  const { stats, loading, error } = useUserStats();

  if (loading) {
    return (
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-6 animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 animate-pulse" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-6 animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Unable to load stats
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2 border-b border-slate-200/60 dark:border-slate-700/60">
      {/* Daily Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Target className="h-3 w-3" />
            <span>Today's Goal</span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
            {stats.todayWords}/{stats.dailyGoal}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${stats.dailyProgress}%`,
              backgroundColor: interfaceColor,
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Words Saved */}
        <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)] hover:bg-[rgba(23,6,100,0.1)] dark:hover:bg-[rgba(23,6,100,0.18)] transition-colors">
          <div className="flex justify-center mb-0.5">
            <BookOpen className="h-3 w-3" style={{ color: interfaceColor }} />
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">
            {stats.wordCount}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Words
          </div>
        </div>

        {/* Chat Sessions */}
        <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)] hover:bg-[rgba(23,6,100,0.1)] dark:hover:bg-[rgba(23,6,100,0.18)] transition-colors">
          <div className="flex justify-center mb-0.5">
            <MessageCircle
              className="h-3 w-3"
              style={{ color: interfaceColor }}
            />
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">
            {stats.chatCount}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Chats
          </div>
        </div>

        {/* Current Streak */}
        <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)] hover:bg-[rgba(23,6,100,0.1)] dark:hover:bg-[rgba(23,6,100,0.18)] transition-colors">
          <div className="flex justify-center mb-0.5">
            <Flame className="h-3 w-3" style={{ color: interfaceColor }} />
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">
            {stats.streak}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Days
          </div>
        </div>
      </div>

      {/* Streak Info */}
      {stats.longestStreak > 0 && (
        <div className="text-center text-[10px] text-slate-500 dark:text-slate-400">
          Best streak: {stats.longestStreak} days
        </div>
      )}

      {/* Wordlist Button */}
      <div className="pt-1">
        <Link href="/wordlist" className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)] hover:bg-[rgba(23,6,100,0.1)] dark:hover:bg-[rgba(23,6,100,0.18)] border-slate-200/60 dark:border-slate-600/60 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-300"
          >
            <BookOpen
              className="h-3 w-3 mr-1"
              style={{ color: interfaceColor }}
            />
            Wordlist
          </Button>
        </Link>
      </div>
    </div>
  );
}
