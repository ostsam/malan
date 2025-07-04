import { NextRequest, NextResponse } from "next/server";
import {
  parseWiktionary,
  fetchOpenAiDefinition,
} from "@/server/dictionary/helpers";
import type { Definition } from "@/server/dictionary/types";
import { fetchMediaWikiDefinition } from "@/server/dictionary/providers/mediawiki";

// Cache the successful response for one hour at the edge
export const revalidate = 3600;

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

  const shouldTryWiki =
    !provider || provider === "wiki" || provider === "wiktionary";
  const shouldTryGPT = provider === "gpt" || !provider; // fallback or explicit

  // 1) Try Wiktionary first (if allowed)
  const wikiURL = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
    word
  )}`;

  if (shouldTryWiki) {
    try {
      const res = await fetch(wikiURL, { next: { revalidate: 3600 } });
      if (res.ok) {
        const json = await res.json();
        let defs: Definition[] = parseWiktionary(json, lang);
        if (defs.length) {
          if (target && target !== lang) {
            const { translateDefinitions } = await import(
              "@/server/dictionary/helpers"
            );
            defs = await translateDefinitions(defs, target);
          }
          return NextResponse.json({ word, defs, source: "wiktionary" });
        }
      }
    } catch (err) {
      console.error("Wiktionary lookup failed", err);
    }
  }

  // 2) GPT if allowed
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

  // 3) MediaWiki if allowed
  if (shouldTryWiki) {
    const defsMW = await fetchMediaWikiDefinition({
      word,
      lang,
      targetLang: target,
    });
    if (defsMW.length) {
      return NextResponse.json({ word, defs: defsMW, source: "wiktionary" });
    }
  }

  // Nothing found
  return NextResponse.json({ word, defs: [], source: "none" }, { status: 404 });
}
