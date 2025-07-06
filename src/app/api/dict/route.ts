import { NextRequest, NextResponse } from "next/server";
import {
  fetchGeminiDefinition,
  fetchOpenAiDefinition,
  translateDefinitions as llmTranslateDefs,
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
      if (target && target !== lang) {
        // Query with translation join when target language differs
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

        return rows.map((r) => ({
          pos: r.pos,
          sense: r.sense,
          translatedSense: r.translatedSense || undefined,
          examples: r.examples,
        })) as Definition[];
      } else {
        // Query without translation join when no target or target = source
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

        return rows.map((r) => ({
          pos: r.pos,
          sense: r.sense,
          examples: r.examples,
        })) as Definition[];
      }
    }

    // Always attempt DB first unless explicitly bypassed
    const dbDefs = await getDefsFromDB();
    if (dbDefs.length > 0 && dbDefs.every((d) => d.sense)) {
      return NextResponse.json({ word, defs: dbDefs, source: "db" });
    }

    // TEMPORARY: Disable wiki lookups until language detection improved
    /*
  const shouldTryWiki =
    !provider || provider === "wiki" || provider === "wiktionary";
  */

    // If no provider specified, try both AI providers in sequence
    const shouldTryGoogle = provider === "google" || !provider; // default to true if no provider specified
    const shouldTryGPT = provider === "gpt" || (!provider && !shouldTryGoogle); // fallback or explicit

    // Helper: persist new defs into DB
    async function persistDefinitions(defs: Definition[]) {
      // Upsert word
      const existingWord = await db
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
        .limit(1);
      let wordId: number;
      if (existingWord.length) {
        wordId = existingWord[0].id;
      } else {
        const inserted = await db
          .insert(wordsTable)
          .values({ word, lang })
          .returning();
        wordId = inserted[0].id;
      }

      // Insert each definition if not exists
      for (const d of defs) {
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
        }

        // Handle translation if available and target differs
        if (target && target !== lang && d.translatedSense) {
          await db
            .insert(transTable)
            .values({
              definitionId: defId,
              targetLang: target,
              translatedSense: d.translatedSense,
              source: "ai",
            })
            .onConflictDoNothing();
        }
      }
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
