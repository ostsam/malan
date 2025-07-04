import { auth } from "@/app/api/auth/[...all]/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  wordlist,
  words as wordsTable,
  definitions as defsTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function WordlistPage({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const lang = searchParams.lang || "en";

  const items = await db
    .select({
      word: wordsTable.word,
      pos: defsTable.pos,
      sense: defsTable.sense,
    })
    .from(wordlist)
    .innerJoin(wordsTable, eq(wordlist.wordId, wordsTable.id))
    .innerJoin(defsTable, eq(defsTable.wordId, wordsTable.id))
    .where(and(eq(wordlist.userId, userId), eq(wordsTable.lang, lang)));

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">
        Wordlist ({lang.toUpperCase()})
      </h1>
      {items.length === 0 ? (
        <p>No words saved yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.word} className="border p-2 rounded">
              <p className="font-semibold">
                {it.word} <span className="text-xs opacity-70">({it.pos})</span>
              </p>
              <p className="text-sm opacity-80">{it.sense}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
