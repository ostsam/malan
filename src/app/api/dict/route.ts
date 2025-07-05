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

// OPTIMIZATION: Add caching headers and improve response times
export const revalidate = 3600; // Cache for 1 hour

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
  const { searchParams } = new URL(req.url);
  const wordInput = searchParams.get("word")?.trim().toLowerCase();
  const lang = searchParams.get("lang")?.toLowerCase() || "en";
  const target = searchParams.get("target")?.toLowerCase();
  const provider = searchParams.get("provider")?.toLowerCase();

  if (!wordInput) {
    return NextResponse.json({ error: "word param required" }, { status: 400 });
  }

  const word = wordInput as string; // non-null

  /* ---------------------------------------------------------------------- */
  /*                        1) Try database first                            */
  /* ---------------------------------------------------------------------- */

  async function getDefsFromDB(): Promise<Definition[]> {
    // OPTIMIZATION: Use a single optimized query with proper joins
    if (target && target !== lang) {
      // Query with translation join when target language differs
      const rows = await db
        .select({
          defId: defsTable.id,
          pos: defsTable.pos,
          sense:
            sql`COALESCE(${transTable.translatedSense}, ${defsTable.sense})`.as(
              "sense"
            ),
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
  if (dbDefs.length === 3 && dbDefs.every((d) => d.sense)) {
    return NextResponse.json(
      { word, defs: dbDefs, source: "db" },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          ETag: `"${Buffer.from(`${word}-${lang}-${target || "none"}`)
            .toString("base64")
            .slice(0, 8)}"`,
        },
      }
    );
  }

  // TEMPORARY: Disable wiki lookups until language detection improved
  /*
  const shouldTryWiki =
    !provider || provider === "wiki" || provider === "wiktionary";
  */
  const shouldTryGoogle = provider === "google" || !provider; // default
  const shouldTryGPT = provider === "gpt" || !provider; // fallback or explicit

  // OPTIMIZATION: Helper: persist new defs into DB with better error handling
  async function persistDefinitions(defs: Definition[]) {
    try {
      // Upsert word with better error handling
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

      // OPTIMIZATION: Batch insert definitions for better performance
      const defsToInsert = defs.map((d) => ({
        wordId,
        pos: d.pos,
        sense: d.sense,
        examples: d.examples,
        source: "ai",
      }));

      const insertedDefs = await db
        .insert(defsTable)
        .values(defsToInsert)
        .onConflictDoNothing()
        .returning({ id: defsTable.id });

      // Handle translations if needed and target differs
      if (target && target !== lang) {
        const transToInsert = defs.map((d, index) => ({
          definitionId: insertedDefs[index]?.id || wordId, // Fallback if insert failed
          targetLang: target,
          translatedSense: d.sense,
          source: "ai",
        }));

        await db.insert(transTable).values(transToInsert).onConflictDoNothing();
      }
    } catch (error) {
      console.error("Failed to persist definitions:", error);
      // Don't fail the request if persistence fails
    }
  }

  // 2) Try Gemini (Google) first
  if (shouldTryGoogle) {
    try {
      const defs = await fetchGeminiDefinition({
        word,
        lang,
        targetLang: target,
      });
      if (defs.length) {
        // OPTIMIZATION: Persist in background to not block response
        setImmediate(() => persistDefinitions(defs));
        return NextResponse.json(
          { word, defs, source: "google" },
          {
            headers: {
              "Cache-Control":
                "public, max-age=1800, stale-while-revalidate=3600",
            },
          }
        );
      }
    } catch (error) {
      console.error("Gemini definition fetch failed:", error);
    }
  }

  // 3) GPT fallback (returns definitions in targetLang if provided)
  if (shouldTryGPT) {
    try {
      const defs = await fetchOpenAiDefinition({
        word,
        lang,
        targetLang: target,
      });
      if (defs.length) {
        // OPTIMIZATION: Persist in background to not block response
        setImmediate(() => persistDefinitions(defs));
        return NextResponse.json(
          { word, defs, source: "openai" },
          {
            headers: {
              "Cache-Control":
                "public, max-age=1800, stale-while-revalidate=3600",
            },
          }
        );
      }
    } catch (error) {
      console.error("OpenAI definition fetch failed:", error);
    }
  }

  // 4) Nothing found
  return NextResponse.json(
    { word, defs: [], source: "none" },
    {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=300", // Cache 404s for 5 minutes
      },
    }
  );
}
