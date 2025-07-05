import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// OPTIMIZATION: Configure connection pooling for better performance
const connectionString = process.env.DATABASE_URL!;

// Connection pool configuration for optimal performance
const client = postgres(connectionString, {
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout of 10 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  prepare: true, // Enable prepared statements for better performance
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const db = drizzle(client, { schema });

// OPTIMIZATION: Graceful shutdown handling
process.on("SIGINT", async () => {
  await client.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await client.end();
  process.exit(0);
});
