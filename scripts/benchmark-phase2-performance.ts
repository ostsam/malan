#!/usr/bin/env tsx

import { db } from "../src/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
  translations as transTable,
} from "../src/db/schema";
import { and, eq, sql, desc, asc, lt, gt, inArray } from "drizzle-orm";

// OPTIMIZATION: Phase 2 Performance Benchmarking
interface BenchmarkResult {
  testName: string;
  duration: number;
  rowCount: number;
  memoryUsage?: number;
}

class Phase2Benchmark {
  private results: BenchmarkResult[] = [];
  private startTime: number = 0;

  private startTimer() {
    this.startTime = performance.now();
  }

  private endTimer(): number {
    return performance.now() - this.startTime;
  }

  private logResult(
    testName: string,
    duration: number,
    rowCount: number,
    memoryUsage?: number
  ) {
    const result: BenchmarkResult = {
      testName,
      duration,
      rowCount,
      memoryUsage,
    };
    this.results.push(result);

    console.log(`✅ ${testName}: ${duration.toFixed(2)}ms (${rowCount} rows)`);
    if (memoryUsage) {
      console.log(`   Memory: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  // Test 1: Paginated wordlist query (new optimized approach)
  async testPaginatedWordlist() {
    console.log("\n🔍 Testing Paginated Wordlist Query...");

    this.startTimer();
    const userId = "test-user-id"; // We'll use a test user

    // Step 1: Get paginated wordlist entries
    const wordlistEntries = await db
      .select({
        wordId: wordlist.wordId,
        createdAt: wordlist.createdAt,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, "en")))
      .orderBy(desc(wordlist.createdAt))
      .limit(51); // +1 to check if there are more results

    const hasMore = wordlistEntries.length > 50;
    const entries = hasMore ? wordlistEntries.slice(0, 50) : wordlistEntries;

    if (entries.length === 0) {
      this.logResult("Paginated Wordlist Query", this.endTimer(), 0);
      return;
    }

    // Step 2: Get word details
    const wordIds = entries.map((e) => e.wordId);
    const words = await db
      .select({
        id: wordsTable.id,
        word: wordsTable.word,
        lang: wordsTable.lang,
        frequencyRank: wordsTable.frequencyRank,
      })
      .from(wordsTable)
      .where(inArray(wordsTable.id, wordIds));

    // Step 3: Get definitions (batch load)
    const definitions = await db
      .select({
        wordId: defsTable.wordId,
        pos: defsTable.pos,
        sense: defsTable.sense,
        examples: defsTable.examples,
      })
      .from(defsTable)
      .where(inArray(defsTable.wordId, wordIds));

    // Step 4: Get translations (batch load)
    const definitionIds = definitions.map((d) => d.wordId);
    const translations = await db
      .select({
        definitionId: transTable.definitionId,
        translatedSense: transTable.translatedSense,
        targetLang: transTable.targetLang,
      })
      .from(transTable)
      .where(
        and(
          inArray(transTable.definitionId, definitionIds),
          eq(transTable.targetLang, "en")
        )
      );

    const duration = this.endTimer();
    this.logResult("Paginated Wordlist Query", duration, entries.length);
  }

  // Test 2: Batch word status check
  async testBatchWordStatus() {
    console.log("\n🔍 Testing Batch Word Status Check...");

    this.startTimer();
    const userId = "test-user-id";
    const testWords = [
      { word: "hello", lang: "en" },
      { word: "world", lang: "en" },
      { word: "test", lang: "en" },
      { word: "example", lang: "en" },
      { word: "sample", lang: "en" },
    ];

    // Get all word IDs in one query
    const wordConditions = testWords.map((w) =>
      and(eq(wordsTable.word, w.word), eq(wordsTable.lang, w.lang))
    );

    const wordIds = await db
      .select({
        id: wordsTable.id,
        word: wordsTable.word,
        lang: wordsTable.lang,
      })
      .from(wordsTable)
      .where(
        wordConditions.length === 1
          ? wordConditions[0]
          : sql`(${wordConditions.join(" OR ")})`
      );

    if (wordIds.length === 0) {
      this.logResult("Batch Word Status Check", this.endTimer(), 0);
      return;
    }

    // Check which words are saved
    const savedWordIds = await db
      .select({ wordId: wordlist.wordId })
      .from(wordlist)
      .where(
        and(
          eq(wordlist.userId, userId),
          inArray(
            wordlist.wordId,
            wordIds.map((w) => w.id)
          )
        )
      );

    const duration = this.endTimer();
    this.logResult("Batch Word Status Check", duration, wordIds.length);
  }

  // Test 3: Summary counts query (already optimized in Phase 1)
  async testSummaryCounts() {
    console.log("\n🔍 Testing Summary Counts Query...");

    this.startTimer();
    const userId = "test-user-id";

    const counts = await db
      .select({ lang: wordsTable.lang, count: sql`count(*)`.as("count") })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, userId))
      .groupBy(wordsTable.lang);

    const duration = this.endTimer();
    this.logResult("Summary Counts Query", duration, counts.length);
  }

  // Test 4: Individual word status check
  async testIndividualWordStatus() {
    console.log("\n🔍 Testing Individual Word Status Check...");

    this.startTimer();
    const userId = "test-user-id";
    const testWord = "hello";
    const testLang = "en";

    const saved = await db
      .select({ id: wordlist.id })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(
        and(
          eq(wordlist.userId, userId),
          eq(wordsTable.word, testWord),
          eq(wordsTable.lang, testLang)
        )
      )
      .limit(1);

    const duration = this.endTimer();
    this.logResult("Individual Word Status Check", duration, saved.length);
  }

  // Test 5: Memory usage test
  async testMemoryUsage() {
    console.log("\n🔍 Testing Memory Usage...");

    const initialMemory = process.memoryUsage().heapUsed;
    this.startTimer();

    // Simulate processing a large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      word: `word${i}`,
      definitions: Array.from({ length: 3 }, (_, j) => ({
        pos: "noun",
        sense: `definition ${j} for word ${i}`,
        examples: [`example ${j} for word ${i}`],
      })),
    }));

    // Process the dataset (simulating client-side processing)
    const processed = largeDataset.map((item) => ({
      ...item,
      defs: item.definitions,
      createdAt: new Date().toISOString(),
      transLang: null,
    }));

    const duration = this.endTimer();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsage = finalMemory - initialMemory;

    this.logResult(
      "Memory Usage Test",
      duration,
      processed.length,
      memoryUsage
    );
  }

  // Test 6: Search performance test
  async testSearchPerformance() {
    console.log("\n🔍 Testing Search Performance...");

    this.startTimer();
    const userId = "test-user-id";
    const searchQuery = "test";

    // Simulate search with pagination
    const searchResults = await db
      .select({
        wordId: wordlist.wordId,
        createdAt: wordlist.createdAt,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(
        and(
          eq(wordlist.userId, userId),
          eq(wordsTable.lang, "en"),
          sql`${wordsTable.word} LIKE ${`%${searchQuery}%`}`
        )
      )
      .orderBy(desc(wordlist.createdAt))
      .limit(50);

    const duration = this.endTimer();
    this.logResult("Search Performance Test", duration, searchResults.length);
  }

  // Run all benchmarks
  async runAllBenchmarks() {
    console.log("🚀 Starting Phase 2 Performance Benchmarks...\n");

    try {
      await this.testSummaryCounts();
      await this.testIndividualWordStatus();
      await this.testBatchWordStatus();
      await this.testPaginatedWordlist();
      await this.testSearchPerformance();
      await this.testMemoryUsage();

      this.printSummary();
    } catch (error) {
      console.error("❌ Benchmark failed:", error);
    }
  }

  // Print summary of all results
  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 PHASE 2 BENCHMARK SUMMARY");
    console.log("=".repeat(60));

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalRows = this.results.reduce((sum, r) => sum + r.rowCount, 0);

    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`Total Rows Processed: ${totalRows}`);

    if (this.results.length > 0) {
      const avgDuration = totalDuration / this.results.length;
      console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    }

    console.log("\nDetailed Results:");
    this.results.forEach((result, index) => {
      console.log(
        `${index + 1}. ${result.testName}: ${result.duration.toFixed(2)}ms`
      );
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ Phase 2 Benchmarks Complete!");
    console.log("=".repeat(60));
  }
}

// Main execution
async function main() {
  const benchmark = new Phase2Benchmark();
  await benchmark.runAllBenchmarks();
}

if (require.main === module) {
  main().catch(console.error);
}
