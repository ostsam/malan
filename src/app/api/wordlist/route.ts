import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
  translations as transTable,
} from "@/db/schema";
import { and, eq, sql, desc, asc, lt, gt, inArray } from "drizzle-orm";
import { auth } from "@/app/api/auth/[...all]/auth";
import { updateUserStreak } from "@/lib/streak-utils";
import { validateWordlistOperation } from "@/lib/validation-schemas";

// Cache successful responses for 5 minutes
export const revalidate = 300;

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// OPTIMIZATION: Add pagination and batch operations
interface PaginationParams {
  limit: number;
  cursor?: string; // ISO timestamp string
  direction: "forward" | "backward";
}

interface BatchWordStatusParams {
  words: Array<{ word: string; lang: string }>;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id)
      return NextResponse.json({ error: "unauth" }, { status: 401 });
    const userId = session.user.id;

    const searchParams = req.nextUrl.searchParams;
    const lang = searchParams.get("lang") || "en";
    const word = searchParams.get("word");
    const nativeLang = searchParams.get("nativeLang") || "en";
    const batch = searchParams.get("batch"); // New: batch word status check

    // OPTIMIZATION: Batch word status check
    if (batch === "true" && word) {
      try {
        const wordData: BatchWordStatusParams = JSON.parse(word);
        const savedStatuses = await getBatchWordStatus(userId, wordData.words);

        const response = NextResponse.json({ savedStatuses });
        response.headers.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=600"
        );
        return response;
      } catch (error) {
        console.error("Batch word status error:", error);
        return NextResponse.json(
          { error: "Invalid batch data" },
          { status: 400 }
        );
      }
    }

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

    // 2) If only lang -> return paginated list of saved words with definitions
    if (lang) {
      const pagination = getPaginationParams(searchParams);
      const result = await getPaginatedWordlist(
        userId,
        lang,
        nativeLang,
        pagination
      );

      const response = NextResponse.json(result);
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=600"
      );
      return response;
    }

    // 3) Summary counts per language with most recent language first
    const counts = await db
      .select({
        lang: wordsTable.lang,
        count: sql`count(*)`.as("count"),
        lastAdded: sql`max(${wordlist.createdAt})`.as("lastAdded"),
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .where(eq(wordlist.userId, userId))
      .groupBy(wordsTable.lang)
      .orderBy(sql`max(${wordlist.createdAt}) desc`);

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

// OPTIMIZATION: Batch word status check
async function getBatchWordStatus(
  userId: string,
  words: Array<{ word: string; lang: string }>
) {
  if (words.length === 0) return {};

  // Get all word IDs in one query - use case-insensitive search
  const wordConditions = words.map((w) =>
    and(
      sql`LOWER(${wordsTable.word}) = LOWER(${w.word})`,
      eq(wordsTable.lang, w.lang)
    )
  );

  const wordIds = await db
    .select({ id: wordsTable.id, word: wordsTable.word, lang: wordsTable.lang })
    .from(wordsTable)
    .where(
      wordConditions.length === 1
        ? wordConditions[0]
        : sql`(${wordConditions.join(" OR ")})`
    );

  if (wordIds.length === 0) {
    return words.reduce(
      (acc, w) => ({ ...acc, [`${w.word}:${w.lang}`]: false }),
      {}
    );
  }

  // Check which words are saved
  const savedWordIds = await db
    .select({ wordId: wordlist.wordId })
    .from(wordlist)
    .where(
      and(
        eq(wordlist.userId, userId),
        inArray(
          wordlist.wordId,
          wordIds.map((w) => w.id)
        )
      )
    );

  const savedIds = new Set(savedWordIds.map((w) => w.wordId));

  // Build result object
  const result: Record<string, boolean> = {};
  wordIds.forEach((w) => {
    result[`${w.word}:${w.lang}`] = savedIds.has(w.id);
  });

  // Add false for words not found in database
  words.forEach((w) => {
    const key = `${w.word}:${w.lang}`;
    if (!(key in result)) {
      result[key] = false;
    }
  });

  return result;
}

// OPTIMIZATION: Pagination helper
function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Cap at 100
  const cursor = searchParams.get("cursor") || undefined;
  const direction =
    (searchParams.get("direction") as "forward" | "backward") || "forward";

  return { limit, cursor, direction };
}

// OPTIMIZATION: Paginated wordlist query
async function getPaginatedWordlist(
  userId: string,
  lang: string,
  nativeLang: string,
  pagination: PaginationParams
) {
  const { limit, cursor, direction } = pagination;

  // Step 1: Get paginated wordlist entries
  let whereConditions = [
    eq(wordlist.userId, userId),
    eq(wordsTable.lang, lang),
  ];

  // Add cursor condition
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (direction === "forward") {
      whereConditions.push(lt(wordlist.createdAt, cursorDate));
    } else {
      whereConditions.push(gt(wordlist.createdAt, cursorDate));
    }
  }

  const wordlistEntries = await db
    .select({
      wordId: wordlist.wordId,
      createdAt: wordlist.createdAt,
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .where(and(...whereConditions))
    .orderBy(
      direction === "forward"
        ? desc(wordlist.createdAt)
        : asc(wordlist.createdAt)
    )
    .limit(limit + 1); // +1 to check if there are more results

  // Check if there are more results
  const hasMore = wordlistEntries.length > limit;
  const entries = hasMore ? wordlistEntries.slice(0, limit) : wordlistEntries;

  if (entries.length === 0) {
    return {
      items: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
        prevCursor: null,
      },
    };
  }

  // Step 2: Get word details
  const wordIds = entries.map((e) => e.wordId);
  const words = await db
    .select({
      id: wordsTable.id,
      word: wordsTable.word,
      lang: wordsTable.lang,
      frequencyRank: wordsTable.frequencyRank,
    })
    .from(wordsTable)
    .where(inArray(wordsTable.id, wordIds));

  // Step 3: Get definitions (batch load)
  const definitions = await db
    .select({
      id: defsTable.id,
      wordId: defsTable.wordId,
      pos: defsTable.pos,
      sense: defsTable.sense,
      examples: defsTable.examples,
    })
    .from(defsTable)
    .where(inArray(defsTable.wordId, wordIds));

  // Step 4: Get translations (batch load)
  const definitionIds = definitions.map((d) => d.id);
  const translations = await db
    .select({
      definitionId: transTable.definitionId,
      translatedSense: transTable.translatedSense,
      targetLang: transTable.targetLang,
    })
    .from(transTable)
    .where(
      and(
        inArray(transTable.definitionId, definitionIds),
        eq(transTable.targetLang, nativeLang)
      )
    );

  // Step 5: Assemble the result - return ALL definitions for each word
  const items: any[] = [];

  for (const entry of entries) {
    const word = words.find((w) => w.id === entry.wordId);
    if (!word) continue;

    const wordDefinitions = definitions.filter(
      (d) => d.wordId === entry.wordId
    );

    // For each definition, create a separate item (like the original API)
    for (const def of wordDefinitions) {
      const wordTranslations = translations.filter(
        (t) => t.definitionId === def.id
      );

      items.push({
        createdAt: entry.createdAt?.toISOString() || new Date().toISOString(),
        word: word.word,
        pos: def.pos || "",
        sense: def.sense || "",
        translatedSense: wordTranslations[0]?.translatedSense || null,
        examples: def.examples || [],
        transLang: wordTranslations[0]?.targetLang || null,
      });
    }
  }

  // Step 6: Calculate pagination cursors
  const lastEntry = entries[entries.length - 1];
  const nextCursor =
    hasMore && lastEntry?.createdAt ? lastEntry.createdAt.toISOString() : null;
  const prevCursor = cursor || null;

  return {
    items,
    pagination: {
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
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
      // Ensure word exists - use case-insensitive search
      const existing = await tx
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(
          and(
            sql`LOWER(${wordsTable.word}) = LOWER(${word})`,
            eq(wordsTable.lang, lang)
          )
        )
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
