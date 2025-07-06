import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
  translations as transTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/app/api/auth/[...all]/auth";
import { updateUserStreak } from "@/lib/streak-utils";
import { validateWordlistOperation } from "@/lib/validation-schemas";

// Cache successful responses for 5 minutes
export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id)
      return NextResponse.json({ error: "unauth" }, { status: 401 });
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang");
    const word = searchParams.get("word");
    const nativeLang = searchParams.get("nativeLang") || "en";

    // 1) If word param -> return saved status (fast query)
    if (word && lang) {
      const saved = await db
        .select({ id: wordlist.id })
        .from(wordlist)
        .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
        .where(
          and(
            eq(wordlist.userId, userId),
            eq(wordsTable.word, word),
            eq(wordsTable.lang, lang)
          )
        )
        .limit(1);

      const response = NextResponse.json({ saved: saved.length > 0 });
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=600"
      );
      return response;
    }

    // 2) If only lang -> return list of saved words with definitions
    if (lang) {
      // OPTIMIZATION: Use more efficient query with better indexing
      const rows = await db
        .select({
          createdAt: wordlist.createdAt,
          word: wordsTable.word,
          pos: defsTable.pos,
          sense: defsTable.sense,
          translatedSense: transTable.translatedSense,
          examples: defsTable.examples,
          transLang: transTable.targetLang,
        })
        .from(wordlist)
        .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
        .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
        .leftJoin(
          transTable,
          and(
            eq(transTable.definitionId, defsTable.id),
            eq(transTable.targetLang, nativeLang)
          )
        )
        .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, lang)))
        .orderBy(wordsTable.word);

      const response = NextResponse.json({ items: rows });
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=600"
      );
      return response;
    }

    // 3) Summary counts per language (fast query)
    const counts = await db
      .select({ lang: wordsTable.lang, count: sql`count(*)`.as("count") })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, userId))
      .groupBy(wordsTable.lang);

    const response = NextResponse.json({ summary: counts });
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600"
    );
    return response;
  } catch (error) {
    console.error("Wordlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id)
      return NextResponse.json({ error: "unauth" }, { status: 401 });
    const userId = session.user.id;

    // Validate request data
    const rawData = await req.json();
    const validatedData = validateWordlistOperation(rawData);
    const { word, lang } = validatedData;

    // OPTIMIZATION: Use transaction for better performance
    const result = await db.transaction(async (tx) => {
      // Ensure word exists
      const existing = await tx
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
        .limit(1);

      if (!existing.length) {
        throw new Error("word not found");
      }
      const wordId = existing[0].id;

      // Check current state
      const already = await tx
        .select({ id: wordlist.id })
        .from(wordlist)
        .where(and(eq(wordlist.userId, userId), eq(wordlist.wordId, wordId)))
        .limit(1);

      let saved: boolean;
      if (already.length) {
        // remove row
        await tx
          .delete(wordlist)
          .where(and(eq(wordlist.userId, userId), eq(wordlist.wordId, wordId)));
        saved = false;
      } else {
        await tx.insert(wordlist).values({ userId, wordId });
        saved = true;
      }

      return { saved };
    });

    // Update streak if word was saved (not removed)
    if (result.saved) {
      await updateUserStreak(userId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Wordlist POST error:", error);
    if (error instanceof Error && error.message === "word not found") {
      return NextResponse.json({ error: "word not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
