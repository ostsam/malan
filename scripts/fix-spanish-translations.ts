import "dotenv/config";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { words, definitions, translations } from "@/db/schema";
import { translateDefinitions } from "@/server/dictionary/helpers";

/* -------------------------------------------------------------------------- */
/*                               DB set-up                                    */
/* -------------------------------------------------------------------------- */

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

/* -------------------------------------------------------------------------- */
/*                           Fix Spanish translations                         */
/* -------------------------------------------------------------------------- */

async function fixSpanishTranslations() {
  console.log("Connecting to DB…");
  await pgClient.connect();
  const db = drizzle(pgClient);

  // Find all Spanish translations that have the same content as the original definition
  console.log("Finding Spanish translations with wrong content...");

  const wrongTranslations = await db
    .select({
      translationId: translations.definitionId,
      targetLang: translations.targetLang,
      translatedSense: translations.translatedSense,
      originalSense: definitions.sense,
      word: words.word,
      pos: definitions.pos,
    })
    .from(translations)
    .innerJoin(definitions, eq(translations.definitionId, definitions.id))
    .innerJoin(words, eq(definitions.wordId, words.id))
    .where(
      and(
        eq(words.lang, "es"), // Spanish words
        eq(translations.targetLang, "en"), // English translations
        sql`${translations.translatedSense} = ${definitions.sense}` // Same content
      )
    )
    .limit(100); // Process in batches

  console.log(
    `Found ${wrongTranslations.length} Spanish translations with wrong content`
  );

  if (wrongTranslations.length === 0) {
    console.log("No wrong translations found!");
    await pgClient.end();
    return;
  }

  // Process each wrong translation
  for (const wrongTrans of wrongTranslations) {
    console.log(`\nProcessing word: ${wrongTrans.word} (${wrongTrans.pos})`);
    console.log(`Original: ${wrongTrans.originalSense.substring(0, 50)}...`);
    console.log(
      `Wrong translation: ${wrongTrans.translatedSense.substring(0, 50)}...`
    );

    try {
      // Generate the correct translation
      const correctTranslation = await translateDefinitions(
        [
          {
            pos: wrongTrans.pos,
            sense: wrongTrans.originalSense,
            examples: [],
          },
        ],
        "en",
        "es"
      );

      if (correctTranslation[0]?.translatedSense) {
        const correctText = correctTranslation[0].translatedSense;
        console.log(`Correct translation: ${correctText.substring(0, 50)}...`);

        // Update the translation in the database
        await db
          .update(translations)
          .set({
            translatedSense: correctText,
          })
          .where(
            and(
              eq(translations.definitionId, wrongTrans.translationId),
              eq(translations.targetLang, "en")
            )
          );

        console.log("✅ Translation fixed!");
      } else {
        console.log("❌ Failed to generate correct translation");
      }
    } catch (error) {
      console.error("❌ Error fixing translation:", error);
    }
  }

  await pgClient.end();
  console.log("\n🎉 Spanish translation fix complete!");
}

/* -------------------------------------------------------------------------- */
/*                                   Entry                                    */
/* -------------------------------------------------------------------------- */

fixSpanishTranslations().catch(console.error);
