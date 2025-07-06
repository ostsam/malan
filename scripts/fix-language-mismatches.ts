import "dotenv/config";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { words, definitions, translations } from "@/db/schema";
import {
  validateDefinitionLanguage,
  correctDefinitionLanguage,
  detectLanguage,
} from "@/server/dictionary/helpers";

/* -------------------------------------------------------------------------- */
/*                       Configuration (edit as needed)                       */
/* -------------------------------------------------------------------------- */

// Languages to scan for mismatches
const LANGUAGES_TO_SCAN = [
  "pt",
  "es",
  "fr",
  "de",
  "it",
  "ru",
  "ja",
  "zh",
  "ko",
  "ar",
  "he",
];

// Batch processing settings
const BATCH_SIZE = 50; // Process this many words at a time
const CONCURRENCY = 5; // Parallel processing limit

/* -------------------------------------------------------------------------- */
/*                               DB set-up                                    */
/* -------------------------------------------------------------------------- */

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
let db: ReturnType<typeof drizzle>;

/* -------------------------------------------------------------------------- */
/*                           Helper: fetch work list                          */
/* -------------------------------------------------------------------------- */

async function loadWordsWithDefinitions(
  db: ReturnType<typeof drizzle>,
  lang: string
) {
  console.log(`[SCAN] Loading words for language: ${lang}`);

  const rows = await db
    .select({
      wordId: words.id,
      word: words.word,
      defId: definitions.id,
      pos: definitions.pos,
      sense: definitions.sense,
      examples: definitions.examples,
    })
    .from(words)
    .innerJoin(definitions, eq(definitions.wordId, words.id))
    .where(eq(words.lang, lang))
    .limit(1000); // Limit for testing, remove for full scan

  console.log(`[SCAN] Found ${rows.length} definitions for ${lang}`);

  // Group by word
  const wordGroups = new Map<string, any[]>();
  for (const row of rows) {
    if (!wordGroups.has(row.word)) {
      wordGroups.set(row.word, []);
    }
    wordGroups.get(row.word)!.push(row);
  }

  return Array.from(wordGroups.entries()).map(([word, defs]) => ({
    word,
    definitions: defs.map((d) => ({
      id: d.defId,
      pos: d.pos,
      sense: d.sense,
      examples: d.examples,
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/*                           Helper: process word                             */
/* -------------------------------------------------------------------------- */

async function processWord(
  wordData: { word: string; definitions: any[] },
  lang: string
): Promise<{ word: string; corrections: number; errors: number }> {
  const { word, definitions: defs } = wordData;
  let corrections = 0;
  let errors = 0;

  try {
    // Validate language of definitions
    const validation = validateDefinitionLanguage(defs, lang);

    if (!validation.isValid) {
      console.log(`[PROCESS] 🚨 Language mismatch detected for "${word}":`, {
        expected: lang,
        detected: validation.detectedLanguages,
        invalidCount: validation.invalidDefinitions.length,
      });

      // Correct the definitions
      const correctionResult = await correctDefinitionLanguage(
        defs,
        lang,
        word
      );

      if (correctionResult.corrections.length > 0) {
        console.log(
          `[PROCESS] ✅ Corrected ${correctionResult.corrections.length} definitions for "${word}"`
        );

        // Update database with corrected definitions
        await updateDefinitionsInDatabase(
          word,
          defs,
          correctionResult.corrected,
          lang
        );
        corrections = correctionResult.corrections.length;
      }
    }
  } catch (error) {
    console.error(`[PROCESS] ❌ Error processing word "${word}":`, error);
    errors = 1;
  }

  return { word, corrections, errors };
}

/* -------------------------------------------------------------------------- */
/*                           Helper: update database                          */
/* -------------------------------------------------------------------------- */

async function updateDefinitionsInDatabase(
  word: string,
  originalDefs: any[],
  correctedDefs: any[],
  lang: string
) {
  // Get the word ID
  const existingWord = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.lang, lang)))
    .limit(1);

  if (!existingWord.length) {
    console.error(`[UPDATE] Word "${word}" not found in database`);
    return;
  }

  const wordId = existingWord[0].id;

  // Update each definition
  for (let i = 0; i < originalDefs.length && i < correctedDefs.length; i++) {
    const originalDef = originalDefs[i];
    const correctedDef = correctedDefs[i];

    try {
      // Update the definition
      await db
        .update(definitions)
        .set({
          sense: correctedDef.sense,
          updatedAt: new Date(),
        })
        .where(eq(definitions.id, originalDef.id));

      console.log(
        `[UPDATE] ✅ Updated definition ID ${originalDef.id} for "${word}"`
      );
    } catch (error) {
      console.error(
        `[UPDATE] ❌ Error updating definition ID ${originalDef.id}:`,
        error
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                           Main processing loop                             */
/* -------------------------------------------------------------------------- */

async function processLanguage(lang: string) {
  console.log(`\n[LANGUAGE] Processing language: ${lang}`);

  const wordsWithDefs = await loadWordsWithDefinitions(db, lang);

  if (wordsWithDefs.length === 0) {
    console.log(`[LANGUAGE] No words found for ${lang}`);
    return;
  }

  let totalCorrections = 0;
  let totalErrors = 0;
  let processedCount = 0;

  // Process in batches
  for (let i = 0; i < wordsWithDefs.length; i += BATCH_SIZE) {
    const batch = wordsWithDefs.slice(i, i + BATCH_SIZE);

    console.log(
      `[BATCH] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(wordsWithDefs.length / BATCH_SIZE)}`
    );

    const results = await Promise.all(
      batch.map((wordData) => processWord(wordData, lang))
    );

    for (const result of results) {
      totalCorrections += result.corrections;
      totalErrors += result.errors;
      processedCount++;
    }

    console.log(
      `[BATCH] Batch complete. Progress: ${processedCount}/${wordsWithDefs.length}`
    );
  }

  console.log(`[LANGUAGE] ✅ ${lang} complete:`, {
    processed: processedCount,
    corrections: totalCorrections,
    errors: totalErrors,
  });
}

/* -------------------------------------------------------------------------- */
/*                               Entrypoint                                   */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log("🔍 Starting language mismatch detection and correction...");

  try {
    console.log("Connecting to database...");
    await pgClient.connect();
    db = drizzle(pgClient);

    console.log("Processing languages:", LANGUAGES_TO_SCAN);

    for (const lang of LANGUAGES_TO_SCAN) {
      await processLanguage(lang);
    }

    console.log("\n✅ Language mismatch correction complete!");
  } catch (error) {
    console.error("❌ Error during processing:", error);
  } finally {
    await pgClient.end();
  }
})();
