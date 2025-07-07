#!/usr/bin/env tsx

import "dotenv/config";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { auth } from "@/app/api/auth/[...all]/auth";

/**
 * Benchmark script to measure wordlist performance
 * This script simulates real user queries and measures response times
 */

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
let db: ReturnType<typeof drizzle>;

interface BenchmarkResult {
  testName: string;
  duration: number;
  rowCount: number;
  query: string;
}

interface PerformanceMetrics {
  totalQueries: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  totalRows: number;
}

async function measureQuery(
  query: string,
  params: any[] = []
): Promise<BenchmarkResult> {
  const startTime = process.hrtime.bigint();

  try {
    const result = await db.execute(sql.raw(query), params);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    return {
      testName: query.substring(0, 50) + "...",
      duration,
      rowCount: result.length,
      query,
    };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;

    return {
      testName: "ERROR: " + query.substring(0, 50) + "...",
      duration,
      rowCount: 0,
      query: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runWordlistBenchmarks(): Promise<BenchmarkResult[]> {
  console.log("🏃 Running wordlist performance benchmarks...");

  const results: BenchmarkResult[] = [];

  // Test 1: Basic wordlist query (most common)
  const basicQuery = `
    SELECT 
      wl.created_at,
      w.word,
      d.pos,
      d.sense,
      t.translated_sense,
      d.examples,
      t.target_lang
    FROM "malan-chatbot_wordlist" wl
    INNER JOIN words w ON wl.word_id = w.id
    INNER JOIN definitions d ON d.word_id = w.id
    LEFT JOIN translations t ON t.definition_id = d.id AND t.target_lang = 'en'
    WHERE wl.user_id = 'test-user-id' AND w.lang = 'en'
    ORDER BY wl.created_at DESC
    LIMIT 50
  `;

  results.push(await measureQuery(basicQuery));

  // Test 2: Wordlist summary by language
  const summaryQuery = `
    SELECT 
      w.lang,
      COUNT(*) as count
    FROM "malan-chatbot_wordlist" wl
    INNER JOIN words w ON wl.word_id = w.id
    WHERE wl.user_id = 'test-user-id'
    GROUP BY w.lang
  `;

  results.push(await measureQuery(summaryQuery));

  // Test 3: Word existence check
  const existenceQuery = `
    SELECT 1
    FROM "malan-chatbot_wordlist" wl
    INNER JOIN words w ON wl.word_id = w.id
    WHERE wl.user_id = 'test-user-id' 
      AND w.word = 'hello' 
      AND w.lang = 'en'
    LIMIT 1
  `;

  results.push(await measureQuery(existenceQuery));

  // Test 4: Search functionality
  const searchQuery = `
    SELECT 
      w.word,
      d.sense
    FROM "malan-chatbot_wordlist" wl
    INNER JOIN words w ON wl.word_id = w.id
    INNER JOIN definitions d ON d.word_id = w.id
    WHERE wl.user_id = 'test-user-id' 
      AND w.lang = 'en'
      AND (w.word ILIKE '%hello%' OR d.sense ILIKE '%hello%')
    ORDER BY w.word
    LIMIT 20
  `;

  results.push(await measureQuery(searchQuery));

  // Test 5: Recent words query
  const recentQuery = `
    SELECT 
      w.word,
      wl.created_at
    FROM "malan-chatbot_wordlist" wl
    INNER JOIN words w ON wl.word_id = w.id
    WHERE wl.user_id = 'test-user-id' AND w.lang = 'en'
    ORDER BY wl.created_at DESC
    LIMIT 10
  `;

  results.push(await measureQuery(recentQuery));

  return results;
}

function calculateMetrics(results: BenchmarkResult[]): PerformanceMetrics {
  const times = results.map((r) => r.duration);
  const totalQueries = results.length;
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / totalQueries;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);

  return {
    totalQueries,
    averageTime,
    minTime,
    maxTime,
    totalTime,
    totalRows,
  };
}

function printBenchmarkResults(
  results: BenchmarkResult[],
  metrics: PerformanceMetrics
) {
  console.log("\n📊 Benchmark Results:");
  console.log("=".repeat(80));

  results.forEach((result, index) => {
    const status =
      result.duration < 100 ? "✅" : result.duration < 500 ? "⚠️" : "❌";
    console.log(`${index + 1}. ${status} ${result.testName}`);
    console.log(
      `   Duration: ${result.duration.toFixed(2)}ms | Rows: ${result.rowCount}`
    );
  });

  console.log("\n📈 Performance Summary:");
  console.log("=".repeat(40));
  console.log(`Total Queries: ${metrics.totalQueries}`);
  console.log(`Average Time: ${metrics.averageTime.toFixed(2)}ms`);
  console.log(`Min Time: ${metrics.minTime.toFixed(2)}ms`);
  console.log(`Max Time: ${metrics.maxTime.toFixed(2)}ms`);
  console.log(`Total Time: ${metrics.totalTime.toFixed(2)}ms`);
  console.log(`Total Rows: ${metrics.totalRows}`);

  // Performance assessment
  console.log("\n🎯 Performance Assessment:");
  if (metrics.averageTime < 50) {
    console.log("✅ EXCELLENT - All queries under 50ms average");
  } else if (metrics.averageTime < 100) {
    console.log("✅ GOOD - Queries under 100ms average");
  } else if (metrics.averageTime < 200) {
    console.log("⚠️  ACCEPTABLE - Queries under 200ms average");
  } else {
    console.log("❌ NEEDS IMPROVEMENT - Queries over 200ms average");
  }
}

async function analyzeIndexUsage() {
  console.log("\n🔍 Analyzing index usage...");

  try {
    const indexUsage = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
          WHEN idx_scan > 0 THEN 
            ROUND((idx_tup_fetch::float / idx_tup_read::float) * 100, 2)
          ELSE 0 
        END as selectivity_percent
      FROM pg_stat_user_indexes 
      WHERE indexname LIKE 'idx_%' OR indexname LIKE '%wordlist%' OR indexname LIKE '%words%'
      ORDER BY idx_scan DESC
    `);

    if (indexUsage.length > 0) {
      console.log("\n📊 Index Usage Analysis:");
      console.log("=".repeat(80));

      indexUsage.forEach((index: any) => {
        const efficiency =
          index.selectivity_percent > 80
            ? "✅"
            : index.selectivity_percent > 50
              ? "⚠️"
              : "❌";
        console.log(`${efficiency} ${index.indexname}`);
        console.log(
          `   Scans: ${index.idx_scan} | Tuples Read: ${index.idx_tup_read} | Selectivity: ${index.selectivity_percent}%`
        );
      });
    } else {
      console.log(
        "ℹ️  No performance indexes found or no usage data available"
      );
    }
  } catch (error) {
    console.log("⚠️  Could not analyze index usage");
  }
}

async function checkSlowQueries() {
  console.log("\n🐌 Checking for slow queries...");

  try {
    const slowQueries = await db.execute(sql`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE (query LIKE '%wordlist%' OR query LIKE '%words%' OR query LIKE '%definitions%')
        AND mean_time > 10
      ORDER BY mean_time DESC
      LIMIT 5
    `);

    if (slowQueries.length > 0) {
      console.log("\n🚨 Slow Queries Detected:");
      slowQueries.forEach((query: any, i: number) => {
        console.log(
          `${i + 1}. Mean time: ${query.mean_time}ms | Calls: ${query.calls}`
        );
        console.log(`   Query: ${query.query.substring(0, 100)}...`);
      });
    } else {
      console.log("✅ No slow queries detected");
    }
  } catch (error) {
    console.log("ℹ️  pg_stat_statements not available for query analysis");
  }
}

// Main execution
(async () => {
  try {
    console.log("🔌 Connecting to database...");
    await pgClient.connect();
    db = drizzle(pgClient);

    console.log("🚀 Starting wordlist performance benchmark");
    console.log("=".repeat(60));

    // Run benchmarks
    const results = await runWordlistBenchmarks();
    const metrics = calculateMetrics(results);

    // Print results
    printBenchmarkResults(results, metrics);

    // Analyze index usage
    await analyzeIndexUsage();

    // Check for slow queries
    await checkSlowQueries();

    console.log("\n🎉 Benchmark completed!");
  } catch (error) {
    console.error("❌ Error during benchmarking:", error);
    process.exit(1);
  } finally {
    await pgClient.end();
    console.log("\n🔌 Database connection closed");
  }
})();
