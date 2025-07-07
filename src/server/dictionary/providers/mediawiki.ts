import type { Definition } from "../types";
import { stripHtml, parseWiktionary } from "../helpers";

/**
 * Fetch definitions from language-specific Wiktionary using MediaWiki action=parse.
 * Only basic scraping – grabs first <ol><li> entries on the page (up to 3) and
 * first <ul> examples list (up to 2) under each.
 */
export async function fetchMediaWikiDefinition({
  word,
  lang,
  targetLang,
}: {
  word: string;
  lang: string; // language of the word / wiki subdomain
  targetLang?: string; // uselang for interface translation
}): Promise<Definition[]> {
  const params = new URLSearchParams({
    action: "parse",
    page: word,
    prop: "text",
    format: "json",
    formatversion: "2",
    redirects: "1",
    origin: "*",
  });
  if (targetLang) params.set("uselang", targetLang);

  const url = `https://${lang}.wiktionary.org/w/api.php?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const html: string | undefined = (json as { parse?: { text?: string } })
      ?.parse?.text;
    if (!html) return [];

    // Very light extraction: take first ordered list items
    const defs: Definition[] = [];

    // Remove newlines for easier regex
    const page = html.replace(/\n+/g, " ");

    // Match first <ol> ... </ol>
    const olMatch = page.match(/<ol[^>]*?>([\s\S]*?)<\/ol>/i);
    if (!olMatch) return [];
    const olContent = olMatch[1];

    const liRegex = /<li[^>]*?>([\s\S]*?)<\/li>/gi;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liRegex.exec(olContent)) && defs.length < 3) {
      const senseRaw = liMatch[1];
      const sense = stripHtml(senseRaw);
      if (!sense) continue;

      // For examples: look for <ul> right after this li
      const afterLiIndex = liMatch.index + liMatch[0].length;
      const following = olContent.slice(afterLiIndex);
      const ulMatch = following.match(/<ul[^>]*?>([\s\S]*?)<\/ul>/i);
      const examples: string[] = [];
      if (ulMatch) {
        const liExRegex = /<li[^>]*?>([\s\S]*?)<\/li>/gi;
        let exMatch: RegExpExecArray | null;
        const ulContent = ulMatch[1];
        while ((exMatch = liExRegex.exec(ulContent)) && examples.length < 2) {
          const exText = stripHtml(exMatch[1]);
          if (exText) examples.push(exText);
        }
      }

      defs.push({ pos: "", sense, examples });
    }
    return defs;
  } catch {
    return [];
  }
}

export async function fetchFromMediaWiki(
  word: string,
  lang: string
): Promise<Definition[]> {
  try {
    const response = await fetch(
      `https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
        word
      )}`
    );

    if (!response.ok) {
      return [];
    }

    const data: unknown = await response.json();
    return parseWiktionary(data, lang);
  } catch (error) {
    console.error("MediaWiki fetch error:", error);
    return [];
  }
}
