import { NextRequest, NextResponse } from "next/server";
import {
  fetchGeminiDefinition,
  fetchOpenAiDefinition,
  translateDefinitions as llmTranslateDefs,
  validateDefinitionLanguage,
  correctDefinitionLanguage,
} from "@/server/dictionary/helpers";
import { db } from "@/db";
import {
  words as wordsTable,
  definitions as defsTable,
  translations as transTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
// import { fetchMediaWikiDefinition } from "@/server/dictionary/providers/mediawiki"; // Disabled temporarily
import type { Definition } from "@/server/dictionary/types";
import { validateDictionaryLookup } from "@/lib/validation-schemas";

// Cache the successful response for one hour at the edge
export const revalidate = 3600;

/* -------------------------------------------------------------------------- */
/*           Heuristic: ensure defs are actually in requested language         */
/* -------------------------------------------------------------------------- */

// Naive script regex per language – extend for more languages as needed.
const langScriptRegex: Record<string, RegExp> = {
  ru: /[а-яА-ЯёЁ]/, // Cyrillic
  he: /[\u0590-\u05FF]/, // Hebrew
  ar: /[\u0600-\u06FF]/, // Arabic
  fa: /[\u0600-\u06FF]/, // Persian
  ja: /[\u3040-\u30FF\u4E00-\u9FFF]/, // Japanese Kana/Kanji
  zh: /[\u4E00-\u9FFF]/, // Chinese Han
};

function defsMatchLanguage(defs: Definition[], langCode: string): boolean {
  const regex = langScriptRegex[langCode];
  if (!regex) return true; // No regex → assume match
  return defs.some((d) => regex.test(d.sense));
}

export async function GET(req: NextRequest) {
  try {
    // Validate query parameters
    const { searchParams } = new URL(req.url);
    const queryData = {
      word: searchParams.get("word")?.trim().toLowerCase(),
      lang: searchParams.get("lang")?.toLowerCase() || "en",
      target: searchParams.get("target")?.toLowerCase(),
      provider: searchParams.get("provider")?.toLowerCase(),
    };

    const validatedData = validateDictionaryLookup(queryData);
    const { word, lang, target, provider } = validatedData;

    /* ---------------------------------------------------------------------- */
    /*                        1) Try database first                            */
    /* ---------------------------------------------------------------------- */

    async function getDefsFromDB(): Promise<Definition[]> {
      console.log(
        "[DB_RETRIEVE] Retrieving from DB for word:",
        word,
        "lang:",
        lang,
        "target:",
        target
      );

      if (target && target !== lang) {
        // Query with translation join when target language differs
        console.log(
          "[DB_RETRIEVE] Querying with translation join for target:",
          target
        );

        const rows = await db
          .select({
            defId: defsTable.id,
            pos: defsTable.pos,
            sense: defsTable.sense,
            translatedSense: transTable.translatedSense,
            examples: defsTable.examples,
          })
          .from(wordsTable)
          .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
          .leftJoin(
            transTable,
            and(
              eq(transTable.definitionId, defsTable.id),
              eq(transTable.targetLang, target)
            )
          )
          .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
          .limit(3);

        console.log(
          "[DB_RETRIEVE] Raw DB rows:",
          rows.map((r) => ({
            defId: r.defId,
            pos: r.pos,
            sense: r.sense.substring(0, 50),
            translatedSense: r.translatedSense?.substring(0, 50) || "NULL",
            examplesCount: r.examples.length,
          }))
        );

        const result = rows.map((r) => ({
          pos: r.pos,
          sense: r.sense,
          translatedSense: r.translatedSense || undefined,
          examples: r.examples,
        })) as Definition[];

        console.log(
          "[DB_RETRIEVE] Processed result:",
          result.map((r) => ({
            pos: r.pos,
            sense: r.sense.substring(0, 50),
            hasTranslatedSense: !!r.translatedSense,
            translatedSense: r.translatedSense?.substring(0, 50),
          }))
        );

        return result;
      } else {
        // Query without translation join when no target or target = source
        console.log("[DB_RETRIEVE] Querying without translation join");

        const rows = await db
          .select({
            defId: defsTable.id,
            pos: defsTable.pos,
            sense: defsTable.sense,
            examples: defsTable.examples,
          })
          .from(wordsTable)
          .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
          .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
          .limit(3);

        console.log(
          "[DB_RETRIEVE] Raw DB rows (no translation):",
          rows.map((r) => ({
            defId: r.defId,
            pos: r.pos,
            sense: r.sense.substring(0, 50),
            examplesCount: r.examples.length,
          }))
        );

        const result = rows.map((r) => ({
          pos: r.pos,
          sense: r.sense,
          examples: r.examples,
        })) as Definition[];

        console.log(
          "[DB_RETRIEVE] Processed result (no translation):",
          result.map((r) => ({
            pos: r.pos,
            sense: r.sense.substring(0, 50),
          }))
        );

        return result;
      }
    }

    // Always attempt DB first unless explicitly bypassed
    const dbDefs = await getDefsFromDB();
    console.log("[API] DB lookup result:", {
      found: dbDefs.length > 0,
      hasAllSenses: dbDefs.every((d) => d.sense),
      hasTarget: !!target,
      hasAllTranslations: target
        ? dbDefs.every((d) => d.translatedSense)
        : true,
    });

    // Validate language of definitions from DB
    if (dbDefs.length > 0) {
      const validation = validateDefinitionLanguage(dbDefs, lang);
      console.log("[API] Language validation:", {
        isValid: validation.isValid,
        detectedLanguages: validation.detectedLanguages,
        invalidCount: validation.invalidDefinitions.length,
      });

      // If definitions are in wrong language, correct them
      if (!validation.isValid) {
        console.log(
          "[API] 🚨 Definitions in wrong language detected, correcting..."
        );

        try {
          const correctionResult = await correctDefinitionLanguage(
            dbDefs,
            lang,
            word,
            target
          );

          if (correctionResult.corrections.length > 0) {
            console.log("[API] ✅ Language corrections applied:", {
              correctionsCount: correctionResult.corrections.length,
              corrections: correctionResult.corrections.map((c) => ({
                reason: c.reason,
                originalPreview: c.original.substring(0, 50),
                correctedPreview: c.corrected.substring(0, 50),
              })),
            });

            // Update the database with corrected definitions
            await updateDefinitionsInDatabase(
              dbDefs,
              correctionResult.corrected,
              word,
              lang
            );

            // Use corrected definitions
            const correctedDefs = correctionResult.corrected;

            // Check if we have complete data after correction
            if (
              correctedDefs.length > 0 &&
              correctedDefs.every((d) => d.sense) &&
              (!target || correctedDefs.every((d) => d.translatedSense))
            ) {
              console.log("[API] Returning corrected data from DB");
              return NextResponse.json({
                word,
                defs: correctedDefs,
                source: "db+correction",
                corrections: correctionResult.corrections.length,
              });
            }
          }
        } catch (error) {
          console.error("[API] ❌ Error during language correction:", error);
          // Continue with original definitions if correction fails
        }
      }
    }

    // Only return early if we have complete data (including translations when requested)
    if (
      dbDefs.length > 0 &&
      dbDefs.every((d) => d.sense) &&
      (!target || dbDefs.every((d) => d.translatedSense))
    ) {
      console.log("[API] Returning complete data from DB");
      return NextResponse.json({ word, defs: dbDefs, source: "db" });
    }

    // If we have definitions but missing translations, we need to generate them
    if (
      dbDefs.length > 0 &&
      dbDefs.every((d) => d.sense) &&
      target &&
      !dbDefs.every((d) => d.translatedSense)
    ) {
      console.log(
        "[API] Found definitions but missing translations, will generate them"
      );

      try {
        console.log(
          "[API] Original definitions from DB:",
          dbDefs.map((d) => ({ pos: d.pos, sense: d.sense.substring(0, 50) }))
        );

        // Generate translations for existing definitions
        const translatedDefs = await llmTranslateDefs(dbDefs, target, lang);

        console.log(
          "[API] Translation results:",
          translatedDefs.map((d) => ({
            pos: d.pos,
            sense: d.sense.substring(0, 50),
            translatedSense: d.translatedSense?.substring(0, 50),
          }))
        );

        // Save translations directly to existing definitions
        await saveTranslationsToExistingDefinitions(
          dbDefs,
          translatedDefs,
          target
        );

        // Combine original definitions with translations
        const combinedDefs = dbDefs.map((originalDef, index) => ({
          ...originalDef,
          translatedSense:
            translatedDefs[index]?.translatedSense ||
            originalDef.translatedSense,
        }));

        console.log(
          "[API] Combined definitions:",
          combinedDefs.map((d) => ({
            pos: d.pos,
            sense: d.sense.substring(0, 50),
            translatedSense: d.translatedSense?.substring(0, 50),
          }))
        );

        console.log(
          "[API] Generated and saved translations, returning combined data"
        );
        return NextResponse.json({ word, defs: combinedDefs, source: "db+ai" });
      } catch (translationError) {
        console.error(
          "[API] Failed to generate translations for existing definitions:",
          translationError
        );
        // Continue with original definitions only
      }
    }

    // TEMPORARY: Disable wiki lookups until language detection improved
    /*
  const shouldTryWiki =
    !provider || provider === "wiki" || provider === "wiktionary";
  */

    // If no provider specified, try both AI providers in sequence
    const shouldTryGoogle = provider === "google" || !provider; // default to true if no provider specified
    const shouldTryGPT = provider === "gpt" || (!provider && !shouldTryGoogle); // fallback or explicit

    // Helper: update definitions in database with corrected versions
    async function updateDefinitionsInDatabase(
      originalDefs: Definition[],
      correctedDefs: Definition[],
      word: string,
      lang: string
    ) {
      console.log(
        "[UPDATE_DEFINITIONS] Starting definition updates for word:",
        word
      );

      // Get the word ID
      const existingWord = await db
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
        .limit(1);

      if (!existingWord.length) {
        console.error("[UPDATE_DEFINITIONS] Word not found in database");
        return;
      }

      const wordId = existingWord[0].id;

      // Update each definition
      for (
        let i = 0;
        i < originalDefs.length && i < correctedDefs.length;
        i++
      ) {
        const originalDef = originalDefs[i];
        const correctedDef = correctedDefs[i];

        // Find the existing definition ID
        const existingDef = await db
          .select({ id: defsTable.id })
          .from(defsTable)
          .where(
            and(
              eq(defsTable.wordId, wordId),
              eq(defsTable.pos, originalDef.pos),
              eq(defsTable.sense, originalDef.sense)
            )
          )
          .limit(1);

        if (!existingDef.length) {
          console.error(
            "[UPDATE_DEFINITIONS] Definition not found in database"
          );
          continue;
        }

        const defId = existingDef[0].id;

        try {
          // Update the definition
          await db
            .update(defsTable)
            .set({
              sense: correctedDef.sense,
              updatedAt: new Date(),
            })
            .where(eq(defsTable.id, defId));

          console.log(
            `[UPDATE_DEFINITIONS] ✅ Updated definition ID ${defId}:`,
            {
              original: originalDef.sense.substring(0, 50),
              corrected: correctedDef.sense.substring(0, 50),
            }
          );

          // If corrected definition has translation, update it too
          if (correctedDef.translatedSense) {
            await db
              .insert(transTable)
              .values({
                definitionId: defId,
                targetLang: target || lang,
                translatedSense: correctedDef.translatedSense,
                source: "ai",
              })
              .onConflictDoUpdate({
                target: [transTable.definitionId, transTable.targetLang],
                set: {
                  translatedSense: correctedDef.translatedSense,
                  source: "ai",
                },
              });

            console.log(
              `[UPDATE_DEFINITIONS] ✅ Updated translation for definition ID ${defId}`
            );
          }
        } catch (error) {
          console.error(
            `[UPDATE_DEFINITIONS] ❌ Error updating definition ID ${defId}:`,
            error
          );
        }
      }

      console.log("[UPDATE_DEFINITIONS] Definition updates complete");
    }

    // Helper: save translations to existing definitions
    async function saveTranslationsToExistingDefinitions(
      originalDefs: Definition[],
      translatedDefs: Definition[],
      targetLang: string
    ) {
      console.log(
        "[SAVE_TRANSLATIONS] Starting translation save for target:",
        targetLang
      );

      // Get the word ID
      const existingWord = await db
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
        .limit(1);

      if (!existingWord.length) {
        console.error("[SAVE_TRANSLATIONS] Word not found in database");
        return;
      }

      const wordId = existingWord[0].id;

      // For each original definition, find its ID and save the translation
      for (let i = 0; i < originalDefs.length; i++) {
        const originalDef = originalDefs[i];
        const translatedDef = translatedDefs[i];

        if (!translatedDef?.translatedSense) {
          console.log(
            "[SAVE_TRANSLATIONS] Skipping definition with no translation"
          );
          continue;
        }

        // Find the existing definition ID
        const existingDef = await db
          .select({ id: defsTable.id })
          .from(defsTable)
          .where(
            and(
              eq(defsTable.wordId, wordId),
              eq(defsTable.pos, originalDef.pos),
              eq(defsTable.sense, originalDef.sense)
            )
          )
          .limit(1);

        if (!existingDef.length) {
          console.error("[SAVE_TRANSLATIONS] Definition not found in database");
          continue;
        }

        const defId = existingDef[0].id;

        console.log(
          "[SAVE_TRANSLATIONS] Saving translation for definition ID:",
          defId
        );

        try {
          const transInsertRes = await db
            .insert(transTable)
            .values({
              definitionId: defId,
              targetLang: targetLang,
              translatedSense: translatedDef.translatedSense,
              source: "ai",
            })
            .onConflictDoNothing()
            .returning({
              definitionId: transTable.definitionId,
              targetLang: transTable.targetLang,
            });

          if (transInsertRes.length > 0) {
            console.log(
              "[SAVE_TRANSLATIONS] ✅ Translation saved successfully:",
              transInsertRes[0]
            );
          } else {
            console.log("[SAVE_TRANSLATIONS] ⚠️ Translation already exists");
          }
        } catch (error) {
          console.error(
            "[SAVE_TRANSLATIONS] ❌ Error saving translation:",
            error
          );
        }
      }

      console.log("[SAVE_TRANSLATIONS] Translation save complete");
    }

    // Helper: persist new defs into DB
    async function persistDefinitions(defs: Definition[]) {
      console.log(
        "[DB_PERSIST] Starting persistence for word:",
        word,
        "lang:",
        lang,
        "target:",
        target
      );
      console.log(
        "[DB_PERSIST] Definitions to save:",
        defs.map((d) => ({
          pos: d.pos,
          sense: d.sense.substring(0, 50),
          translatedSense: d.translatedSense?.substring(0, 50),
        }))
      );

      // Upsert word
      const existingWord = await db
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
        .limit(1);
      let wordId: number;
      if (existingWord.length) {
        wordId = existingWord[0].id;
        console.log("[DB_PERSIST] Using existing word ID:", wordId);
      } else {
        const inserted = await db
          .insert(wordsTable)
          .values({ word, lang })
          .returning();
        wordId = inserted[0].id;
        console.log("[DB_PERSIST] Created new word ID:", wordId);
      }

      // Insert each definition if not exists
      for (const d of defs) {
        console.log("[DB_PERSIST] Processing definition:", {
          pos: d.pos,
          sense: d.sense.substring(0, 50),
        });

        const insertRes = await db
          .insert(defsTable)
          .values({
            wordId,
            pos: d.pos,
            sense: d.sense,
            examples: d.examples,
            source: "ai",
          })
          .onConflictDoNothing()
          .returning({ id: defsTable.id });

        let defId: number;
        if (insertRes.length) {
          defId = insertRes[0].id;
          console.log("[DB_PERSIST] Created new definition ID:", defId);
        } else {
          const existing = await db
            .select({ id: defsTable.id })
            .from(defsTable)
            .where(
              and(
                eq(defsTable.wordId, wordId),
                eq(defsTable.pos, d.pos),
                eq(defsTable.sense, d.sense)
              )
            )
            .limit(1);
          defId = existing[0].id;
          console.log("[DB_PERSIST] Using existing definition ID:", defId);
        }

        // Handle translation if available and target differs
        if (target && target !== lang && d.translatedSense) {
          console.log("[DB_PERSIST] Attempting to save translation:", {
            definitionId: defId,
            targetLang: target,
            translatedSense: d.translatedSense.substring(0, 50),
          });

          try {
            const transInsertRes = await db
              .insert(transTable)
              .values({
                definitionId: defId,
                targetLang: target,
                translatedSense: d.translatedSense,
                source: "ai",
              })
              .onConflictDoNothing()
              .returning({
                definitionId: transTable.definitionId,
                targetLang: transTable.targetLang,
              });

            if (transInsertRes.length > 0) {
              console.log(
                "[DB_PERSIST] ✅ Translation saved successfully:",
                transInsertRes[0]
              );
            } else {
              console.log(
                "[DB_PERSIST] ⚠️ Translation already exists or conflict occurred"
              );

              // Check if translation actually exists
              const existingTrans = await db
                .select({ translatedSense: transTable.translatedSense })
                .from(transTable)
                .where(
                  and(
                    eq(transTable.definitionId, defId),
                    eq(transTable.targetLang, target)
                  )
                )
                .limit(1);

              if (existingTrans.length > 0) {
                console.log(
                  "[DB_PERSIST] ✅ Translation exists in DB:",
                  existingTrans[0].translatedSense.substring(0, 50)
                );
              } else {
                console.log(
                  "[DB_PERSIST] ❌ Translation not found in DB - this indicates a problem!"
                );
              }
            }
          } catch (error) {
            console.error("[DB_PERSIST] ❌ Error saving translation:", error);
          }
        } else {
          console.log(
            "[DB_PERSIST] Skipping translation - conditions not met:",
            {
              hasTarget: !!target,
              targetDiffers: target !== lang,
              hasTranslatedSense: !!d.translatedSense,
            }
          );
        }
      }

      console.log("[DB_PERSIST] Persistence complete for word:", word);
    }

    // 2) Try Gemini (Google) first if no provider specified or explicitly requested
    if (shouldTryGoogle) {
      try {
        // First, get definitions in the original language (the language being learned)
        const originalDefs = await fetchGeminiDefinition({
          word,
          lang,
          targetLang: undefined, // Get original language definitions
        });

        if (originalDefs.length > 0) {
          let finalDefs = originalDefs;

          // If we have a target language (native language), translate the definitions
          if (target && target !== lang) {
            try {
              // Translate the original definitions to the native language
              const translatedDefs = await llmTranslateDefs(
                originalDefs,
                target,
                lang
              );

              // Combine original and translated definitions
              finalDefs = originalDefs.map((originalDef, index) => ({
                ...originalDef,
                translatedSense: translatedDefs[index]?.sense || undefined,
              }));
            } catch (translationError) {
              console.error("Translation fetch failed:", translationError);
              // Continue with original definitions only
            }
          }

          await persistDefinitions(finalDefs);
          return NextResponse.json({ word, defs: finalDefs, source: "google" });
        }
      } catch (error) {
        console.error("Gemini definition fetch failed:", error);
        // Continue to GPT fallback
      }
    }

    // 3) GPT fallback
    if (shouldTryGPT) {
      try {
        // First, get definitions in the original language (the language being learned)
        const originalDefs = await fetchOpenAiDefinition({
          word,
          lang,
          targetLang: undefined, // Get original language definitions
        });

        if (originalDefs.length > 0) {
          let finalDefs = originalDefs;

          // If we have a target language (native language), translate the definitions
          if (target && target !== lang) {
            try {
              // Translate the original definitions to the native language
              const translatedDefs = await llmTranslateDefs(
                originalDefs,
                target,
                lang
              );

              // Combine original and translated definitions
              finalDefs = originalDefs.map((originalDef, index) => ({
                ...originalDef,
                translatedSense: translatedDefs[index]?.sense || undefined,
              }));
            } catch (translationError) {
              console.error("Translation fetch failed:", translationError);
              // Continue with original definitions only
            }
          }

          await persistDefinitions(finalDefs);
          return NextResponse.json({ word, defs: finalDefs, source: "openai" });
        }
      } catch (error) {
        console.error("OpenAI definition fetch failed:", error);
      }
    }

    // 4) Final fallback: try to get original definitions and translate them
    if (target && target !== lang) {
      try {
        // Try to get original definitions without target language
        const originalDefs = await fetchGeminiDefinition({
          word,
          lang,
          targetLang: undefined, // Get original language definitions
        });

        if (originalDefs.length > 0) {
          // Now translate them to target language
          const translatedDefs = await llmTranslateDefs(
            originalDefs,
            target,
            lang
          );

          // Combine original and translated definitions
          const combinedDefs = originalDefs.map((originalDef, index) => ({
            ...originalDef,
            translatedSense: translatedDefs[index]?.sense || undefined,
          }));

          await persistDefinitions(combinedDefs);
          return NextResponse.json({
            word,
            defs: combinedDefs,
            source: "google",
          });
        }
      } catch (error) {
        console.error("Translation fallback failed:", error);
      }
    }

    // 5) Nothing found
    return NextResponse.json(
      { word, defs: [], source: "none" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Dictionary API error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  }
}
