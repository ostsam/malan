import "dotenv/config";
import { Client } from "pg";

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

async function fixMessageOrdering() {
  console.log("🔧 Fixing message ordering issues...");

  try {
    await pgClient.connect();
    console.log("✅ Connected to database");

    // Step 1: Update any messages with null createdAt to have a proper timestamp
    console.log("📝 Updating messages with null createdAt...");
    const updateResult = await pgClient.query(`
      UPDATE "malan-chatbot_messagesTable" 
      SET "createdAt" = CURRENT_TIMESTAMP 
      WHERE "createdAt" IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} messages with null timestamps`);

    // Step 2: Add default value to createdAt column
    console.log("🔧 Adding default value to createdAt column...");
    await pgClient.query(`
      ALTER TABLE "malan-chatbot_messagesTable" 
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP
    `);
    console.log("✅ Added default value to createdAt column");

    // Step 3: Make createdAt NOT NULL
    console.log("🔧 Making createdAt NOT NULL...");
    await pgClient.query(`
      ALTER TABLE "malan-chatbot_messagesTable" 
      ALTER COLUMN "createdAt" SET NOT NULL
    `);
    console.log("✅ Made createdAt NOT NULL");

    // Step 4: Verify the fix by checking message ordering
    console.log("🔍 Verifying message ordering...");
    const testResult = await pgClient.query(`
      SELECT "chatId", "messageId", "createdAt", "role", "content"
      FROM "malan-chatbot_messagesTable"
      WHERE "chatId" IN (
        SELECT "chatId" FROM "malan-chatbot_messagesTable" 
        GROUP BY "chatId" 
        HAVING COUNT(*) > 1
        LIMIT 3
      )
      ORDER BY "chatId", "createdAt"
      LIMIT 20
    `);

    console.log("📊 Sample of ordered messages:");
    testResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Chat: ${row.chatId.slice(0, 8)}... | Role: ${row.role} | Time: ${row.createdAt} | Content: ${row.content.slice(0, 50)}...`);
    });

    console.log("\n🎉 Message ordering fix completed successfully!");

  } catch (error) {
    console.error("❌ Error fixing message ordering:", error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// Run the fix
fixMessageOrdering().catch(console.error); 