import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { wordlist, userSession, words as wordsTable } from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";
import { getStreakHistory } from "@/lib/streak-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range =
      (searchParams.get("range") as "7d" | "30d" | "90d" | "all-time") || "30d";

    // Calculate date range
    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 0;
    const startDate = days > 0 ? new Date() : null;
    if (startDate) {
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get daily word counts (only for time-based ranges)
    let dailyWords: any[] = [];
    if (days > 0) {
      dailyWords = await db
        .select({
          date: sql<string>`DATE(${wordlist.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(wordlist)
        .where(
          and(eq(wordlist.userId, userId), gte(wordlist.createdAt, startDate!))
        )
        .groupBy(sql`DATE(${wordlist.createdAt})`)
        .orderBy(sql`DATE(${wordlist.createdAt})`);
    }

    // Get daily chat counts (only for time-based ranges)
    let dailyChats: any[] = [];
    if (days > 0) {
      dailyChats = await db
        .select({
          date: sql<string>`DATE(${userSession.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(userSession)
        .where(
          and(
            eq(userSession.userId, userId),
            gte(userSession.createdAt, startDate!)
          )
        )
        .groupBy(sql`DATE(${userSession.createdAt})`)
        .orderBy(sql`DATE(${userSession.createdAt})`);
    }

    // Get language distribution based on range
    let languageDistributionQuery = db
      .select({
        lang: wordsTable.lang,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, userId));

    // Add time filter for non-all-time ranges
    if (days > 0) {
      languageDistributionQuery = languageDistributionQuery.where(
        gte(wordlist.createdAt, startDate!)
      );
    }

    const languageDistribution = await languageDistributionQuery
      .groupBy(wordsTable.lang)
      .orderBy(sql`count(*) desc`);

    // Create date map for easy lookup (only for time-based ranges)
    const dateMap = new Map<string, { words: number; chats: number }>();
    let dailyData: any[] = [];

    if (days > 0) {
      // Initialize all dates in range
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate!);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        dateMap.set(dateStr, { words: 0, chats: 0 });
      }

      // Fill in actual data
      dailyWords.forEach(({ date, count }) => {
        const existing = dateMap.get(date) || { words: 0, chats: 0 };
        existing.words = count;
        dateMap.set(date, existing);
      });

      dailyChats.forEach(({ date, count }) => {
        const existing = dateMap.get(date) || { words: 0, chats: 0 };
        existing.chats = count;
        dateMap.set(date, existing);
      });

      // Convert to chart format
      dailyData = Array.from(dateMap.entries()).map(([date, data]) => {
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return {
          date: dateStr,
          words: data.words,
          chats: data.chats,
        };
      });
    }

    // Get actual streak history (only for time-based ranges)
    let streakData: any[] = [];
    if (days > 0) {
      streakData = await getStreakHistory(userId, days);
    }

    const response = NextResponse.json({
      dailyData,
      streakData,
      languageDistribution,
    });

    // Cache chart data for 5 minutes
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );

    return response;
  } catch (error) {
    console.error("[CHARTS API] Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
