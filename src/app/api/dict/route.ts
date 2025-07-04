import { NextRequest, NextResponse } from "next/server";
import { fetchOpenAiDefinition } from "@/server/dictionary/helpers";
// import { fetchMediaWikiDefinition } from "@/server/dictionary/providers/mediawiki"; // Disabled temporarily
import type { Definition } from "@/server/dictionary/types";

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
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word")?.trim().toLowerCase();
  const lang = searchParams.get("lang")?.toLowerCase() || "en";
  const target = searchParams.get("target")?.toLowerCase();
  const provider = searchParams.get("provider")?.toLowerCase();

  if (!word) {
    return NextResponse.json({ error: "word param required" }, { status: 400 });
  }

  // Choose provider logic

  // TEMPORARY: Disable wiki lookups until language detection improved
  /*
  const shouldTryWiki =
    !provider || provider === "wiki" || provider === "wiktionary";
  */
  const shouldTryWiki = false;
  const shouldTryGPT = provider === "gpt" || !provider; // fallback or explicit

  // 2) GPT fallback (returns definitions in targetLang if provided)
  if (shouldTryGPT) {
    const defs = await fetchOpenAiDefinition({
      word,
      lang,
      targetLang: target,
    });
    if (defs.length) {
      return NextResponse.json({ word, defs, source: "openai" });
    }
  }

  // 3) Nothing found
  return NextResponse.json({ word, defs: [], source: "none" }, { status: 404 });
}
