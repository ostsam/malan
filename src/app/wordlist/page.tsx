import { auth } from "@/app/api/auth/[...all]/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { wordlist, words as wordsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import OptimizedWordlistClient from "./OptimizedWordlistClient";

// OPTIMIZATION: Use dynamic rendering for better performance
export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export default async function WordlistPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // OPTIMIZATION: Get summary counts per language with most recent language first
  const summary = await db
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

  // OPTIMIZATION: Get initial items for first page (limited to 50)
  const initialItems = await db
    .select({
      createdAt: wordlist.createdAt,
      word: wordsTable.word,
      pos: sql`''`.as("pos"), // Will be filled by client-side processing
      sense: sql`''`.as("sense"), // Will be filled by client-side processing
      translatedSense: sql`null`.as("translatedSense"), // Will be filled by client-side processing
      examples: sql`'[]'`.as("examples"), // Will be filled by client-side processing
      transLang: sql`null`.as("transLang"), // Will be filled by client-side processing
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .where(eq(wordlist.userId, userId))
    .orderBy(wordlist.createdAt)
    .limit(50);

  // OPTIMIZATION: Get user's native language from session
  const nativeLang = "en"; // Default to English since nativeLanguage not in session

  // Convert database results to expected types
  const typedInitialItems = initialItems.map((item) => ({
    createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
    word: item.word,
    pos: item.pos as string,
    sense: item.sense as string,
    translatedSense: item.translatedSense as string | null,
    examples: item.examples as string[],
    transLang: item.transLang as string | null,
  }));

  const typedSummary = summary.map((item) => {
    let lastAdded: string = "";
    if (typeof item.lastAdded === "string") {
      lastAdded = item.lastAdded;
    } else if (item.lastAdded instanceof Date) {
      lastAdded = item.lastAdded.toISOString();
    } else {
      lastAdded = "";
    }
    return {
      lang: item.lang,
      count: Number(item.count),
      lastAdded,
    };
  });

  return (
    <OptimizedWordlistClient
      initialLang={summary[0]?.lang || "en"}
      initialItems={typedInitialItems}
      summary={typedSummary}
      nativeLang={nativeLang}
    />
  );
}
