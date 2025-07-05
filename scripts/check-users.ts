import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "../src/db/schema";
import { eq } from "drizzle-orm";

config({ path: ".env" });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function checkUsers() {
  try {
    console.log("🔍 Checking existing users...\n");

    const users = await db.select().from(user);

    if (users.length === 0) {
      console.log("✅ No users found in database");
      return;
    }

    console.log(`📊 Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Verified: ${user.emailVerified ? "✅ Yes" : "❌ No"}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   ID: ${user.id}`);
      console.log("");
    });

    // Check for unverified users
    const unverifiedUsers = users.filter((u) => !u.emailVerified);
    if (unverifiedUsers.length > 0) {
      console.log(`⚠️  Found ${unverifiedUsers.length} unverified user(s):`);
      unverifiedUsers.forEach((u) => {
        console.log(`   - ${u.email} (created: ${u.createdAt})`);
      });
      console.log("\n💡 You can delete unverified users to test signup again.");
    }
  } catch (error) {
    console.error("❌ Error checking users:", error);
  } finally {
    await client.end();
  }
}

async function deleteUser(email: string) {
  try {
    console.log(`🗑️  Deleting user with email: ${email}`);

    // First check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (existingUser.length === 0) {
      console.log("❌ User not found");
      return;
    }

    // Delete the user
    await db.delete(user).where(eq(user.email, email));
    console.log("✅ User deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting user:", error);
  } finally {
    await client.end();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

if (command === "delete" && email) {
  deleteUser(email);
} else {
  checkUsers();
}
