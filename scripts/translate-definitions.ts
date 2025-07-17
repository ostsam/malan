import "dotenv/config";
import pLimit from "p-limit";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { words, definitions, translations } from "@/db/schema";
import { translateDefinitions } from "@/server/dictionary/helpers";

/* -------------------------------------------------------------------------- */
/*                       Configuration (edit as needed)                       */
/* -------------------------------------------------------------------------- */

// Full set of languages present in the dictionary
const LANGS = ["en", "es", "fr", "de", "it", "ja", "zh", "ko", "ru", "pt"];

const BATCH_SIZE = 25; // reduced batch size to minimize risk
const CONCURRENCY = 10; // reduced concurrency to minimize risk

/* -------------------------------------------------------------------------- */
/*                               DB set-up                                    */
/* -------------------------------------------------------------------------- */

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
const limit = pLimit(CONCURRENCY);

/* -------------------------------------------------------------------------- */
/*                           Helper: fetch work list                          */
/* -------------------------------------------------------------------------- */

async function loadPendingDefinitionBatches(
  db: ReturnType<typeof drizzle>,
  sourceLang: string,
  targetLang: string
) {
  // Pull definitions for SOURCE_LANG whose sense isn't yet translated into targetLang
  const rows = await db
    .select({
      defId: definitions.id,
      pos: definitions.pos,
      sense: definitions.sense,
      examples: definitions.examples,
    })
    .from(definitions)
    .innerJoin(words, eq(definitions.wordId, words.id))
    .where(
      and(
        eq(words.lang, sourceLang),
        // not exists translation row
        sql`${definitions.id} NOT IN (SELECT definition_id FROM translations WHERE target_lang = ${targetLang})`
      )
    );

  // Split into batches of size BATCH_SIZE
  const batches: { ids: number[]; defs: any[] }[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    batches.push({
      ids: slice.map((r) => r.defId),
      defs: slice.map((r) => ({
        pos: r.pos,
        sense: r.sense,
        examples: r.examples,
      })),
    });
  }
  return batches;
}

// Helper: detect rate limit error
function isRateLimitError(err: any) {
  return (
    err?.response?.status === 429 ||
    (typeof err?.message === "string" && err.message.toLowerCase().includes("rate limit"))
  );
}

// Helper: translate with retry and backoff
async function translateBatchWithRetry(defs: any[], targetLang: string, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await translateDefinitions(defs, targetLang);
    } catch (err: any) {
      if (isRateLimitError(err)) {
        const waitMs = 30000 * (attempt + 1); // 30s, 60s, 90s, ...
        console.warn(`Rate limit hit, pausing for ${waitMs / 1000}s...`);
        await new Promise(res => setTimeout(res, waitMs));
        attempt++;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded for translation batch");
}

/* -------------------------------------------------------------------------- */
/*                        Main translation routine per lang                    */
/* -------------------------------------------------------------------------- */

async function translateInto(
  db: ReturnType<typeof drizzle>,
  sourceLang: string,
  targetLang: string
) {
  const batches = await loadPendingDefinitionBatches(
    db,
    sourceLang,
    targetLang
  );
  if (batches.length === 0) {
    console.log(`✔️  Nothing to translate into ${targetLang}`);
    return;
  }

  console.log(
    `▶️  Translating ${sourceLang} → ${targetLang} – ${batches.length} batches…`
  );

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const tasks: Promise<void>[] = [];

  batches.forEach(({ ids, defs }, batchIdx) => {
    tasks.push(
      limit(async () => {
        try {
          const translated = await translateBatchWithRetry(defs, targetLang);
          let batchInserted = 0;
          let batchSkipped = 0;
          for (let i = 0; i < ids.length; i++) {
            const defId = ids[i];
            const tSense = translated[i]?.translatedSense;
            if (tSense && tSense !== defs[i].sense) {
              await db
                .insert(translations)
                .values({
                  definitionId: defId,
                  targetLang,
                  translatedSense: tSense,
                  source: "ai",
                })
                .onConflictDoNothing();
              inserted++;
              batchInserted++;
            } else {
              skipped++;
              batchSkipped++;
              // Only log skipped if there was a real issue
              if (!tSense) {
                console.warn(
                  `⚠️  Skipped: No translation for defId ${defId}`
                );
              } else if (tSense === defs[i].sense) {
                console.warn(
                  `⚠️  Skipped: Translation identical to source for defId ${defId}`
                );
              }
            }
          }
          // Concise batch progress
          console.log(
            `Batch ${batchIdx + 1}/${batches.length}: ${sourceLang} → ${targetLang} | Inserted: ${batchInserted}, Skipped: ${batchSkipped}`
          );
        } catch (err: any) {
          failed++;
          console.error(
            `❌  ${sourceLang}→${targetLang} batch ${batchIdx + 1} failed: ${err.message || err}`
          );
        }
      })
    );
  });

  await Promise.all(tasks);
  console.log(`🎉 Completed ${sourceLang} → ${targetLang}`);
  console.log(`Summary: Inserted: ${inserted}, Skipped: ${skipped}, Failed: ${failed}`);
}

/* -------------------------------------------------------------------------- */
/*                                   Entry                                    */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log("Connecting to DB…");
  await pgClient.connect();
  const db = drizzle(pgClient);

  for (const source of LANGS) {
    for (const target of LANGS) {
      if (target === source) continue;
      await translateInto(db, source, target);
    }
  }

  await pgClient.end();
  console.log("All done ✅");
})();