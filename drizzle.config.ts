import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env" });

export default <Config>{
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
