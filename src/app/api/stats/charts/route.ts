import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { wordlist, userSession } from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") as "7d" | "30d" | "90d") || "30d";

    // Calculate date range
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Get daily word counts
    const dailyWords = await db
      .select({
        date: sql<string>`DATE(${wordlist.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .where(
        and(eq(wordlist.userId, userId), gte(wordlist.createdAt, startDate))
      )
      .groupBy(sql`DATE(${wordlist.createdAt})`)
      .orderBy(sql`DATE(${wordlist.createdAt})`);

    // Get daily chat counts
    const dailyChats = await db
      .select({
        date: sql<string>`DATE(${userSession.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(userSession)
      .where(
        and(
          eq(userSession.userId, userId),
          gte(userSession.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${userSession.createdAt})`)
      .orderBy(sql`DATE(${userSession.createdAt})`);

    // Create date map for easy lookup
    const dateMap = new Map<string, { words: number; chats: number }>();

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
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
    const dailyData = Array.from(dateMap.entries()).map(([date, data]) => {
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

    // Generate streak data (simplified for now)
    const streakData = dailyData.map((item, index) => ({
      date: item.date,
      streak: Math.max(0, Math.floor(Math.random() * 10)), // Placeholder
    }));

    const response = NextResponse.json({
      dailyData,
      streakData,
    });

    // Cache chart data for 5 minutes
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );

    return response;
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
