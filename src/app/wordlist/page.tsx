import { auth } from "@/app/api/auth/[...all]/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
  userSession,
  translations as transTable,
} from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import WordlistClient from "./WordlistClient";

export const dynamic = "force-dynamic";

export default async function WordlistPage({
  params: _paramsPromise,
  searchParams: _searchParamsPromise,
}: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<{ lang?: string }>;
}) {
  // Await params promise to satisfy streaming type requirements (unused)
  await _paramsPromise;

  // Extract `lang` from the (now promise-based) search params
  const { lang } = await _searchParamsPromise;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Derive native language from most-recent chat settings (fallback 'en')
  const lastChatRows = await db
    .select({ settings: userSession.settings })
    .from(userSession)
    .where(eq(userSession.userId, userId))
    .orderBy(desc(userSession.createdAt))
    .limit(1);
  const initialLang = (lang || "en").toLowerCase();
  let nativeLang = "en";
  if (lastChatRows.length) {
    try {
      const settingsObj = JSON.parse(
        lastChatRows[0].settings as unknown as string
      );
      if (
        typeof settingsObj === "object" &&
        settingsObj !== null &&
        settingsObj.nativeLanguage
      ) {
        nativeLang = (settingsObj.nativeLanguage as string).toLowerCase();
      }
    } catch {}
  }

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
    .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, initialLang)))
    .orderBy(wordsTable.word);

  const rawSummary = await db
    .select({
      lang: wordsTable.lang,
      count: sql`count(*)`.as("count"),
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .where(eq(wordlist.userId, userId))
    .groupBy(wordsTable.lang);

  // Ensure count is numeric
  const summary = rawSummary.map((s) => ({
    ...s,
    count: Number(s.count),
  }));

  const items = rows.map((r: any) => ({
    ...r,
    createdAt: r.createdAt ? r.createdAt.toISOString() : "",
    translatedSense: (r.translatedSense as string | null) ?? null,
    transLang: (r.transLang as string | null) ?? null,
  }));

  return (
    <WordlistClient
      initialLang={initialLang}
      initialItems={items}
      summary={summary}
      nativeLang={nativeLang}
    />
  );
}
