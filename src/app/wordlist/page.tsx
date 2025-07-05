import { auth } from "@/app/api/auth/[...all]/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
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
  const initialLang = (lang || "en").toLowerCase();

  const items = await db
    .select({
      word: wordsTable.word,
      pos: defsTable.pos,
      sense: defsTable.sense,
      examples: defsTable.examples,
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
    .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, initialLang)))
    .orderBy(wordsTable.word);

  const summary = await db
    .select({
      lang: wordsTable.lang,
      count: sql`count(*)`.as("count"),
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .where(eq(wordlist.userId, userId))
    .groupBy(wordsTable.lang);

  return (
    <WordlistClient
      initialLang={initialLang}
      initialItems={items}
      summary={summary}
    />
  );
}
