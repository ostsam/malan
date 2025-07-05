import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { wordlist, userSession, userPreferences } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUserStreak } from "@/lib/streak-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user stats in parallel
    const [wordCount, chatCount, streak, preferences] = await Promise.all([
      // Count saved words
      db
        .select({ count: sql<number>`count(*)` })
        .from(wordlist)
        .where(eq(wordlist.userId, userId))
        .then((result) => result[0]?.count || 0),

      // Count chat sessions
      db
        .select({ count: sql<number>`count(*)` })
        .from(userSession)
        .where(eq(userSession.userId, userId))
        .then((result) => result[0]?.count || 0),

      // Get streak information
      getUserStreak(userId),

      // Get user preferences for daily goal
      db
        .select({
          dailyGoal: userPreferences.dailyGoal,
        })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1)
        .then((result) => result[0] || { dailyGoal: 10 }),
    ]);

    // Calculate today's progress (words saved today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const todayWords = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordlist)
      .where(
        sql`${wordlist.userId} = ${userId} AND DATE(${wordlist.createdAt}) = DATE(${todayStr})`
      )
      .then((result) => result[0]?.count || 0);

    const stats = {
      wordCount,
      chatCount,
      streak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      dailyGoal: preferences.dailyGoal || 10,
      todayWords,
      dailyProgress: Math.min(
        (todayWords / (preferences.dailyGoal || 10)) * 100,
        100
      ),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
