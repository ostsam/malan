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

const BATCH_SIZE = 35; // number of definitions per LLM call
const CONCURRENCY = 10; // parallel LLM calls / DB inserts

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

  const tasks: Promise<void>[] = [];

  batches.forEach(({ ids, defs }, batchIdx) => {
    tasks.push(
      limit(async () => {
        try {
          const translated = await translateDefinitions(defs, targetLang);
          // Insert each translation row
          for (let i = 0; i < ids.length; i++) {
            const defId = ids[i];
            const tSense = translated[i]?.sense || defs[i].sense;
            await db
              .insert(translations)
              .values({
                definitionId: defId,
                targetLang,
                translatedSense: tSense,
                source: "ai",
              })
              .onConflictDoNothing();
          }
          console.log(
            `✅  ${sourceLang}→${targetLang} batch ${batchIdx + 1}/${batches.length}`
          );
        } catch (err) {
          console.error(
            `❌  ${sourceLang}→${targetLang} batch ${batchIdx + 1} failed`,
            err
          );
        }
      })
    );
  });

  await Promise.all(tasks);
  console.log(`🎉 Completed ${sourceLang} → ${targetLang}`);
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
