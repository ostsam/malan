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

// OPTIMIZATION: Use dynamic rendering for better performance
export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export default async function WordlistPage({
  params: _paramsPromise,
  searchParams: _searchParamsPromise,
}: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<{ lang?: string }>;
}) {
  try {
    // Await params promise to satisfy streaming type requirements (unused)
    await _paramsPromise;

    // Extract `lang` from the (now promise-based) search params
    const { lang } = await _searchParamsPromise;

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) redirect("/login");
    const userId = session.user.id;

    // OPTIMIZATION: Parallelize database queries
    const [lastChatRows, summaryData] = await Promise.all([
      // Derive native language from most-recent chat settings (fallback 'en')
      db
        .select({ settings: userSession.settings })
        .from(userSession)
        .where(eq(userSession.userId, userId))
        .orderBy(desc(userSession.createdAt))
        .limit(1),

      // Get summary counts per language
      db
        .select({
          lang: wordsTable.lang,
          count: sql`count(*)`.as("count"),
        })
        .from(wordlist)
        .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
        .where(eq(wordlist.userId, userId))
        .groupBy(wordsTable.lang),
    ]);

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

    // OPTIMIZATION: Only fetch data for the selected language
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
      .orderBy(wordsTable.word)
      .limit(1000); // OPTIMIZATION: Add limit to prevent excessive data loading

    // Ensure count is numeric
    const summary = summaryData.map((s) => ({
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
  } catch (error) {
    console.error("Wordlist page error:", error);
    // Return a simple error state instead of crashing
    return (
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Wordlist</h1>
        <p className="text-red-600">
          Failed to load wordlist. Please try again.
        </p>
      </div>
    );
  }
}
