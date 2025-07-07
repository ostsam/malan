#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { wordlist, words as wordsTable } from "../src/db/schema";
import { eq, sql, gte } from "drizzle-orm";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const pgClient = postgres(connectionString);
let db: any;

async function testLanguageDistribution() {
  try {
    console.log("🔌 Connecting to database...");
    db = drizzle(pgClient);

    // Test with a sample user ID
    const testUserId = "aXtCgOqidOejpeYG5iGeUcJZf8TA1x3k";

    console.log(`\n🔍 Testing language distribution for user: ${testUserId}`);

    // 1. Check total wordlist entries for this user
    const totalWordlistEntries = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordlist)
      .where(eq(wordlist.userId, testUserId));

    console.log(
      `\n📊 Total wordlist entries: ${totalWordlistEntries[0]?.count || 0}`
    );

    // 2. Check language distribution (all time)
    const allTimeLanguageDistribution = await db
      .select({
        lang: wordsTable.lang,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, testUserId))
      .groupBy(wordsTable.lang)
      .orderBy(sql`count(*) desc`);

    console.log(`\n🌍 All-time language distribution:`);
    if (allTimeLanguageDistribution.length === 0) {
      console.log("  No language data found");
    } else {
      allTimeLanguageDistribution.forEach(
        ({ lang, count }: { lang: string; count: number }) => {
          console.log(`  ${lang}: ${count} words`);
        }
      );
    }

    // 3. Check language distribution for last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const recentLanguageDistribution = await db
      .select({
        lang: wordsTable.lang,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(
        eq(wordlist.userId, testUserId) && gte(wordlist.createdAt, startDate)
      )
      .groupBy(wordsTable.lang)
      .orderBy(sql`count(*) desc`);

    console.log(`\n🌍 Recent language distribution (last 30 days):`);
    if (recentLanguageDistribution.length === 0) {
      console.log("  No recent language data found");
    } else {
      recentLanguageDistribution.forEach(
        ({ lang, count }: { lang: string; count: number }) => {
          console.log(`  ${lang}: ${count} words`);
        }
      );
    }

    // 4. Check sample wordlist entries with words
    const sampleEntries = await db
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
      .limit(5);

    console.log(`\n📝 Sample wordlist entries:`);
    sampleEntries.forEach((entry: any, i: number) => {
      console.log(
        `  ${i + 1}. ID: ${entry.wordlistId}, Word: "${entry.word}" (${entry.lang}), Created: ${entry.createdAt}`
      );
    });
  } catch (error) {
    console.error("❌ Error testing language distribution:", error);
  } finally {
    await pgClient.end();
    console.log("\n🔌 Database connection closed");
  }
}

if (require.main === module) {
  testLanguageDistribution().catch(console.error);
}
