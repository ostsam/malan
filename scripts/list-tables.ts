#!/usr/bin/env tsx

import "dotenv/config";
import { Client } from "pg";

async function listTables() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
  `);
  console.log("Tables in database:");
  res.rows.forEach((row) => console.log("-", row.tablename));
  await client.end();
}

listTables();
