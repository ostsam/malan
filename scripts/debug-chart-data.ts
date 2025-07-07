#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { wordlist, userSession, words as wordsTable } from "../src/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const pgClient = postgres(connectionString);
let db: any;

async function debugChartData() {
  try {
    console.log("🔌 Connecting to database...");
    db = drizzle(pgClient);

    // Test with a sample user ID
    const testUserId = "aXtCgOqidOejpeYG5iGeUcJZf8TA1x3k";

    console.log(`\n🔍 Debugging chart data for user: ${testUserId}`);

    // 1. Check total wordlist entries for this user
    const totalWordlistEntries = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordlist)
      .where(eq(wordlist.userId, testUserId));

    console.log(
      `\n📊 Total wordlist entries: ${totalWordlistEntries[0]?.count || 0}`
    );

    // 2. Check total words in words table
    const totalWords = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordsTable);

    console.log(`📊 Total words in words table: ${totalWords[0]?.count || 0}`);

    // 3. Check wordlist entries with actual word data
    const wordlistWithWords = await db
      .select({
        wordlistId: wordlist.id,
        wordId: wordlist.wordId,
        createdAt: wordlist.createdAt,
        word: wordsTable.word,
        lang: wordsTable.lang,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, testUserId))
      .limit(10);

    console.log(`\n📝 Sample wordlist entries with words:`);
    wordlistWithWords.forEach((entry, i) => {
      console.log(
        `  ${i + 1}. ID: ${entry.wordlistId}, Word: "${entry.word}" (${entry.lang}), Created: ${entry.createdAt}`
      );
    });

    // 4. Check daily word counts for last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const dailyWords = await db
      .select({
        date: sql<string>`DATE(${wordlist.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .where(
        and(eq(wordlist.userId, testUserId), gte(wordlist.createdAt, startDate))
      )
      .groupBy(sql`DATE(${wordlist.createdAt})`)
      .orderBy(sql`DATE(${wordlist.createdAt})`);

    console.log(`\n📅 Daily word counts (last 7 days):`);
    if (dailyWords.length === 0) {
      console.log("  No word activity in the last 7 days");
    } else {
      dailyWords.forEach(({ date, count }) => {
        console.log(`  ${date}: ${count} words`);
      });
    }

    // 5. Check language distribution
    const languageDistribution = await db
      .select({
        lang: wordsTable.lang,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, testUserId))
      .groupBy(wordsTable.lang)
      .orderBy(sql`count(*) desc`);

    console.log(`\n🌍 Language distribution:`);
    if (languageDistribution.length === 0) {
      console.log("  No language data found");
    } else {
      languageDistribution.forEach(({ lang, count }) => {
        console.log(`  ${lang}: ${count} words`);
      });
    }

    // 6. Check user sessions
    const userSessions = await db
      .select({
        chatId: userSession.chatId,
        createdAt: userSession.createdAt,
        settings: userSession.settings,
      })
      .from(userSession)
      .where(eq(userSession.userId, testUserId))
      .limit(5);

    console.log(`\n💬 User sessions:`);
    if (userSessions.length === 0) {
      console.log("  No chat sessions found");
    } else {
      userSessions.forEach((session, i) => {
        console.log(
          `  ${i + 1}. Chat ID: ${session.chatId}, Created: ${session.createdAt}`
        );
        if (session.settings) {
          const settings =
            typeof session.settings === "string"
              ? JSON.parse(session.settings)
              : session.settings;
          console.log(`     Settings: ${JSON.stringify(settings, null, 2)}`);
        }
      });
    }

    // 7. Check daily chat counts
    const dailyChats = await db
      .select({
        date: sql<string>`DATE(${userSession.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(userSession)
      .where(
        and(
          eq(userSession.userId, testUserId),
          gte(userSession.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${userSession.createdAt})`)
      .orderBy(sql`DATE(${userSession.createdAt})`);

    console.log(`\n📅 Daily chat counts (last 7 days):`);
    if (dailyChats.length === 0) {
      console.log("  No chat activity in the last 7 days");
    } else {
      dailyChats.forEach(({ date, count }) => {
        console.log(`  ${date}: ${count} chats`);
      });
    }
  } catch (error) {
    console.error("❌ Error debugging chart data:", error);
  } finally {
    await pgClient.end();
    console.log("\n🔌 Database connection closed");
  }
}

if (require.main === module) {
  debugChartData().catch(console.error);
}
