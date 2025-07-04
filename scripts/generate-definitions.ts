import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import OpenAI from "openai";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { words, definitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * This script pre-generates dictionary definitions for the most-frequent
 * words of each language and stores them in the Postgres tables we created
 * (words & definitions). It is SAFE to run multiple times; on-conflict it
 * ignores duplicates.
 *
 * Usage (local):
 *   bunx -r dotenv/config tsx scripts/generate-definitions.ts
 *
 * Assumptions:
 * 1. You have a .env with DATABASE_URL & OPENAI_API_KEY
 * 2. CSV frequency files live in data/frequency/<lang>_top10k.csv
 *    columns: rank,word,lang
 */

const TOP_N = 50_000;
const BATCH_SIZE = 20;
const CONCURRENCY = 8;
const TARGET_LANGS = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "ja",
  "zh",
  "ko",
  "ru",
  "pt",
];

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pgClient);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const limit = pLimit(CONCURRENCY);

async function upsertWord(word: string, lang: string) {
  await db.insert(words).values({ word, lang }).onConflictDoNothing();
  const [{ id }] = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.lang, lang)));
  return id;
}

async function upsertDefs(wordId: number, defs: any[]) {
  for (const d of defs) {
    await db
      .insert(definitions)
      .values({
        wordId,
        pos: d.pos || "noun",
        sense: d.sense,
        examples: d.examples ?? [],
        source: "ai",
      })
      .onConflictDoNothing();
  }
}

async function fetchDefsBatch(lang: string, batch: string[]) {
  const prompt = `For each ${lang} word below give up to 5 short senses plus 2 example sentences. Return STRICT JSON array matching: [{\"word\":w,\"defs\":[{\"pos\":\"noun\",\"sense\":\"...\",\"examples\":[\"...\"]}]}]. Words: ${batch.join(", ")}`;
  const { choices } = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = choices[0].message?.content?.trim() ?? "[]";
  return JSON.parse(raw.replace(/```json|```/g, ""));
}

async function processLanguage(lang: string) {
  const file = path.join("data/frequency", `${lang}_top10k.csv`);
  const rows = (await fs.readFile(file, "utf8"))
    .split(/\r?\n/)
    .slice(1, TOP_N + 1);
  const wordsArr = rows.map((r) => r.split(",")[1]);

  for (let i = 0; i < wordsArr.length; i += BATCH_SIZE) {
    const batch = wordsArr.slice(i, i + BATCH_SIZE);
    await limit(async () => {
      const defsArr = await fetchDefsBatch(lang, batch);
      for (const { word, defs } of defsArr) {
        const id = await upsertWord(word, lang);
        await upsertDefs(id, defs);
      }
      console.log(`✅ ${lang}: ${i + batch.length}/${wordsArr.length}`);
    });
  }
}

(async () => {
  console.log("Generating definitions…");
  for (const lang of TARGET_LANGS) {
    await processLanguage(lang);
  }
  await pgClient.end();
  console.log("Done");
})();
