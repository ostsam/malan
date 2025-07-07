#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { recalculateUserStreak } from "../src/lib/streak-utils";
import { userPreferences } from "../src/db/schema";
import { sql } from "drizzle-orm";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const pgClient = postgres(connectionString);
let db: any;

interface FixResult {
  userId: string;
  oldCurrentStreak: number;
  oldLongestStreak: number;
  newCurrentStreak: number;
  newLongestStreak: number;
  fixed: boolean;
}

class StreakDataFixer {
  private results: FixResult[] = [];

  async fixAllUserStreaks() {
    console.log("🔧 Starting streak data fix process...");
    console.log("=".repeat(60));

    try {
      // Get all users with preferences
      const users = await db
        .select({
          userId: userPreferences.userId,
          currentStreak: userPreferences.currentStreak,
          longestStreak: userPreferences.longestStreak,
        })
        .from(userPreferences);

      console.log(`📊 Found ${users.length} users to process`);

      let processed = 0;
      let fixed = 0;

      for (const user of users) {
        try {
          console.log(`\n👤 Processing user: ${user.userId}`);

          const oldCurrentStreak = user.currentStreak || 0;
          const oldLongestStreak = user.longestStreak || 0;

          // Recalculate streak based on actual activity
          const { currentStreak, longestStreak } = await recalculateUserStreak(
            user.userId
          );

          const isFixed =
            oldCurrentStreak !== currentStreak ||
            oldLongestStreak !== longestStreak;

          const result: FixResult = {
            userId: user.userId,
            oldCurrentStreak,
            oldLongestStreak,
            newCurrentStreak: currentStreak,
            newLongestStreak: longestStreak,
            fixed: isFixed,
          };

          this.results.push(result);

          if (isFixed) {
            console.log(
              `  ✅ Fixed: ${oldCurrentStreak}→${currentStreak} current, ${oldLongestStreak}→${longestStreak} longest`
            );
            fixed++;
          } else {
            console.log(
              `  ℹ️  No changes needed: ${currentStreak} current, ${longestStreak} longest`
            );
          }

          processed++;

          // Add a small delay to avoid overwhelming the database
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`  ❌ Error processing user ${user.userId}:`, error);
        }
      }

      this.printSummary(processed, fixed);
    } catch (error) {
      console.error("❌ Error during streak data fix:", error);
    }
  }

  private printSummary(processed: number, fixed: number) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 STREAK DATA FIX SUMMARY");
    console.log("=".repeat(60));

    console.log(`Total users processed: ${processed}`);
    console.log(`Users with fixed data: ${fixed}`);
    console.log(`Users unchanged: ${processed - fixed}`);

    if (fixed > 0) {
      console.log("\n🔧 Detailed fixes:");
      this.results
        .filter((r) => r.fixed)
        .forEach((result) => {
          console.log(`  ${result.userId}:`);
          console.log(
            `    Current streak: ${result.oldCurrentStreak} → ${result.newCurrentStreak}`
          );
          console.log(
            `    Longest streak: ${result.oldLongestStreak} → ${result.newLongestStreak}`
          );
        });
    }

    console.log("\n🎉 Streak data fix completed!");
  }

  async validateStreakData() {
    console.log("\n🔍 Validating streak data integrity...");

    try {
      // Check for users with invalid streak data
      const invalidUsers = await db
        .select({
          userId: userPreferences.userId,
          currentStreak: userPreferences.currentStreak,
          longestStreak: userPreferences.longestStreak,
          lastActivityDate: userPreferences.lastActivityDate,
        })
        .from(userPreferences)
        .where(
          sql`(${userPreferences.currentStreak} > ${userPreferences.longestStreak}) OR 
              (${userPreferences.currentStreak} < 0) OR 
              (${userPreferences.longestStreak} < 0)`
        );

      if (invalidUsers.length > 0) {
        console.log(
          `⚠️  Found ${invalidUsers.length} users with invalid streak data:`
        );
        invalidUsers.forEach((user) => {
          console.log(
            `  ${user.userId}: current=${user.currentStreak}, longest=${user.longestStreak}`
          );
        });
      } else {
        console.log("✅ All streak data appears valid");
      }

      // Check for users with no activity but non-zero streaks
      const usersWithNoActivity = await db
        .select({
          userId: userPreferences.userId,
          currentStreak: userPreferences.currentStreak,
          longestStreak: userPreferences.longestStreak,
        })
        .from(userPreferences)
        .where(
          sql`(${userPreferences.currentStreak} > 0 OR ${userPreferences.longestStreak} > 0) AND 
              ${userPreferences.lastActivityDate} IS NULL`
        );

      if (usersWithNoActivity.length > 0) {
        console.log(
          `⚠️  Found ${usersWithNoActivity.length} users with streaks but no activity date:`
        );
        usersWithNoActivity.forEach((user) => {
          console.log(
            `  ${user.userId}: current=${user.currentStreak}, longest=${user.longestStreak}`
          );
        });
      }
    } catch (error) {
      console.error("❌ Error validating streak data:", error);
    }
  }
}

// Main execution
async function main() {
  try {
    console.log("🔌 Connecting to database...");
    db = drizzle(pgClient);

    const fixer = new StreakDataFixer();

    // Validate current data
    await fixer.validateStreakData();

    // Fix streak data
    await fixer.fixAllUserStreaks();

    // Validate again
    await fixer.validateStreakData();
  } catch (error) {
    console.error("❌ Error during streak data fix:", error);
    process.exit(1);
  } finally {
    await pgClient.end();
    console.log("\n🔌 Database connection closed");
  }
}

if (require.main === module) {
  main().catch(console.error);
}
