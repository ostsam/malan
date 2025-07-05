import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/app/api/auth/[...all]/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");
  const word = searchParams.get("word");

  // 1) If word param -> return saved status
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
    return NextResponse.json({ saved: saved.length > 0 });
  }

  // 2) If only lang -> return list of saved words with definitions
  if (lang) {
    const rows = await db
      .select({
        createdAt: wordlist.createdAt,
        word: wordsTable.word,
        pos: defsTable.pos,
        sense: defsTable.sense,
        examples: defsTable.examples,
      })
      .from(wordlist)
      .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
      .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
      .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, lang)));
    return NextResponse.json({ items: rows });
  }

  // 3) Summary counts per language
  const counts = await db
    .select({ lang: wordsTable.lang, count: sql`count(*)`.as("count") })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .where(eq(wordlist.userId, userId))
    .groupBy(wordsTable.lang);
  return NextResponse.json({ summary: counts });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  const userId = session.user.id;

  let { word, lang } = await req.json();
  if (typeof word === "string") word = word.toLowerCase();
  if (typeof lang === "string") lang = lang.toLowerCase();
  if (!word || !lang)
    return NextResponse.json({ error: "word+lang required" }, { status: 400 });

  // Ensure word exists
  const existing = await db
    .select({ id: wordsTable.id })
    .from(wordsTable)
    .where(and(eq(wordsTable.word, word), eq(wordsTable.lang, lang)))
    .limit(1);
  if (!existing.length) {
    return NextResponse.json({ error: "word not found" }, { status: 404 });
  }
  const wordId = existing[0].id;

  // Check current state
  const already = await db
    .select({ id: wordlist.id })
    .from(wordlist)
    .where(and(eq(wordlist.userId, userId), eq(wordlist.wordId, wordId)))
    .limit(1);

  let saved: boolean;
  if (already.length) {
    // remove row
    await db
      .delete(wordlist)
      .where(and(eq(wordlist.userId, userId), eq(wordlist.wordId, wordId)));
    saved = false;
  } else {
    await db.insert(wordlist).values({ userId, wordId });
    saved = true;
  }

  return NextResponse.json({ saved });
}
