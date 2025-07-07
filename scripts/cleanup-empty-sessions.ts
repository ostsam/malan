#!/usr/bin/env tsx

import "dotenv/config";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, and, notInArray } from "drizzle-orm";
import { userSession, messagesTable } from "../src/db/schema";

/**
 * Background script to clean up empty chat sessions
 * This should be run periodically (e.g., daily) instead of on every API request
 */

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
let db: ReturnType<typeof drizzle>;

async function cleanupEmptySessions() {
  console.log("🧹 Starting cleanup of empty chat sessions...");

  try {
    // Find sessions that have no messages
    const chatsWithMessagesSubquery = db
      .selectDistinct({ chatId: messagesTable.chatId })
      .from(messagesTable);

    // Delete empty sessions
    const result = await db
      .delete(userSession)
      .where(notInArray(userSession.chatId, chatsWithMessagesSubquery));

    console.log(
      `✅ Cleaned up empty sessions. Deleted ${result.rowCount || 0} sessions.`
    );
  } catch (error) {
    console.error("❌ Error cleaning up empty sessions:", error);
  }
}

async function updateLastMessageAt() {
  console.log(
    "🔄 Updating lastMessageAt for sessions with missing timestamps..."
  );

  try {
    // Update sessions that have messages but no lastMessageAt
    const result = await db.execute(sql`
      UPDATE "malan-chatbot_user-sessions-table" 
      SET "lastMessageAt" = (
        SELECT MAX("createdAt") 
        FROM "malan-chatbot_messagesTable" 
        WHERE "chatId" = "malan-chatbot_user-sessions-table"."chatId"
      )
      WHERE "lastMessageAt" IS NULL 
      AND EXISTS (
        SELECT 1 
        FROM "malan-chatbot_messagesTable" 
        WHERE "chatId" = "malan-chatbot_user-sessions-table"."chatId"
      )
    `);

    console.log(`✅ Updated lastMessageAt for sessions.`);
  } catch (error) {
    console.error("❌ Error updating lastMessageAt:", error);
  }
}

async function main() {
  try {
    console.log("🔌 Connecting to database...");
    await pgClient.connect();
    db = drizzle(pgClient);

    await cleanupEmptySessions();
    await updateLastMessageAt();

    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    console.log("🔌 Database connection closed");
    await pgClient.end();
  }
}

main();
