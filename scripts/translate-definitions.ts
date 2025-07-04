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

// Language of the existing dictionary words (e.g. "en")
const SOURCE_LANG = process.env.SOURCE_LANG || "en";
// One or more native languages to translate the senses into (comma-separated)
const NATIVE_LANGS = (process.env.NATIVE_LANGS || "ru").split(/,\s*/);

const BATCH_SIZE = 20; // number of definitions per LLM call
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
        eq(words.lang, SOURCE_LANG),
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
  targetLang: string
) {
  const batches = await loadPendingDefinitionBatches(db, targetLang);
  if (batches.length === 0) {
    console.log(`✔️  Nothing to translate into ${targetLang}`);
    return;
  }

  console.log(
    `▶️  Translating into ${targetLang} – ${batches.length} batches…`
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
            `✅  ${targetLang} batch ${batchIdx + 1}/${batches.length}`
          );
        } catch (err) {
          console.error(`❌  ${targetLang} batch ${batchIdx + 1} failed`, err);
        }
      })
    );
  });

  await Promise.all(tasks);
  console.log(`🎉 Completed ${targetLang}`);
}

/* -------------------------------------------------------------------------- */
/*                                   Entry                                    */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log("Connecting to DB…");
  await pgClient.connect();
  const db = drizzle(pgClient);

  for (const lang of NATIVE_LANGS) {
    await translateInto(db, lang);
  }

  await pgClient.end();
  console.log("All done ✅");
})();
