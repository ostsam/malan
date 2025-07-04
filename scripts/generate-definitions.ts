import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { words, definitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

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

// Process only the most-frequent 10 000 words for now
const TOP_N = 10_000;

// To stay within ~4000 requests/min (~66 rps) and 1M tokens/min we:
// - Reduce batch size so each request returns roughly 250 tokens (≈50 tokens/word)
// - Set concurrency near the rps limit (66) to fully saturate throughput.

const BATCH_SIZE = 5; // ≈250 tokens/req → 16.5k tokens/sec @ 66 rps
const CONCURRENCY = 66; // parallel requests cap

// For now we only need English definitions
const TARGET_LANGS = ["ja", "zh", "ko", "ru", "pt"];

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
let db: ReturnType<typeof drizzle>;

const limit = pLimit(CONCURRENCY);

// ---------------------------------------------------------------------------
//                       Model helpers (Gemini + GPT)
// ---------------------------------------------------------------------------

const geminiModelId =
  process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite-preview-06-17";

function getGeminiModel() {
  return google(geminiModelId);
}

const openaiModelId = process.env.OPENAI_MODEL_ID || "gpt-3.5-turbo";

function getOpenAiModel() {
  return openai(openaiModelId);
}

async function runGeminiPrompt(prompt: string, temperature = 0.2) {
  const { text } = await generateText({
    model: getGeminiModel(),
    prompt,
    temperature,
  });
  return text.trim();
}

async function runOpenAiPrompt(prompt: string, temperature = 0.2) {
  const { text } = await generateText({
    model: getOpenAiModel(),
    prompt,
    temperature,
  });
  return text.trim();
}

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
  const prompt = `You are forbidden to use any language except ${lang}. The "sense" text must be 100 % in ${lang}. If you would need to use another language, return just the ${lang} word for "sin traducción". For each ${lang} word below give up to 5 short senses plus 3 example sentences. Return STRICT JSON array matching: [{\"word\":w,\"defs\":[{\"pos\":\"noun\",\"sense\":\"...\",\"examples\":[\"ex 1\",\"ex 2\",\"ex 3\"]}]}]. Words: ${batch.join(", ")}`;

  // Try Gemini first
  try {
    const geminiContent = await runGeminiPrompt(prompt, 0.2);
    if (geminiContent) {
      return JSON.parse(geminiContent.replace(/```json|```/g, ""));
    }
  } catch (err) {
    console.warn("Gemini batch failed, falling back to OpenAI", err);
  }

  // Fallback to OpenAI
  const openAiContent = await runOpenAiPrompt(prompt, 0.2);
  return JSON.parse(openAiContent.replace(/```json|```/g, ""));
}

async function processLanguage(lang: string) {
  // Load already-processed words for this lang to avoid duplicate API calls
  const existingRows = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.lang, lang));
  const processed = new Set(existingRows.map((r) => r.word));

  const file = path.join("data/frequency", `${lang}_50k.txt`);
  const rows = (await fs.readFile(file, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, TOP_N);
  const wordsArr = rows.map((w) => w.trim()).filter((w) => !processed.has(w));

  if (wordsArr.length === 0) {
    console.log(`ℹ️  All ${lang} words already processed, skipping.`);
    return;
  }

  const tasks: Promise<void>[] = [];

  for (let i = 0; i < wordsArr.length; i += BATCH_SIZE) {
    const batch = wordsArr.slice(i, i + BATCH_SIZE);
    const index = i;
    tasks.push(
      limit(async () => {
        try {
          const defsArr = await fetchDefsBatch(lang, batch);
          for (const { word, defs } of defsArr) {
            const id = await upsertWord(word, lang);
            await upsertDefs(id, defs);
          }
          console.log(`✅ ${lang}: ${index + batch.length}/${wordsArr.length}`);
        } catch (err) {
          console.error(`❌ Failed batch at ${index}`, err);
        }
      })
    );
  }

  await Promise.all(tasks);
}

// Entrypoint ---------------------------------------------------------------

(async () => {
  console.log("Connecting to database…");
  await pgClient.connect();
  db = drizzle(pgClient);

  console.log("Generating definitions…");
  for (const lang of TARGET_LANGS) {
    await processLanguage(lang);
  }

  await pgClient.end();
  console.log("Done");
})();
