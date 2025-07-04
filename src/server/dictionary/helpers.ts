import type { Definition, FetchDefinitionParams } from "./types";
import OpenAI from "openai";

/**
 * Extract up to the first three definitions from the Wiktionary REST API JSON
 * keeping at most two example sentences for each.
 */
export function parseWiktionary(json: any, filterLang?: string): Definition[] {
  const result: Definition[] = [];

  if (!json || typeof json !== "object") return result;

  // The Wiktionary REST response groups entries by language code key.
  // Each value is an array of entries with partOfSpeech and definitions arrays.
  Object.entries<any>(json).forEach(([langKey, entries]) => {
    if (filterLang && langKey.toLowerCase() !== filterLang.toLowerCase())
      return;

    if (!Array.isArray(entries)) return;

    entries.forEach((entry: any) => {
      if (result.length >= 3) return; // stop early

      const pos: string = entry.partOfSpeech || entry.pos || "unknown";
      const defs = Array.isArray(entry.definitions) ? entry.definitions : [];

      defs.forEach((d: any) => {
        if (result.length >= 3) return;

        const rawSense: string =
          typeof d === "string" ? d : d.definition || d.meaning || "";
        const sense = stripHtml(rawSense);
        if (!sense) return;

        const examplesRaw = d.examples || [];
        const examples: string[] = (examplesRaw as any[])
          .map((e) => {
            const exampleText =
              typeof e === "string"
                ? e
                : e.example || e.text || e.translation || "";
            return stripHtml(exampleText);
          })
          .filter(Boolean)
          .slice(0, 2);

        result.push({ pos, sense, examples });
      });
    });
  });

  return result.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/*                         OpenAI fallback (simplified)                       */
/* -------------------------------------------------------------------------- */

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables.");
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Fetch a concise dictionary definition using OpenAI when Wiktionary has none.
 * The model is prompted to return STRICT JSON that matches Definition[] shape.
 */
export async function fetchOpenAiDefinition({
  word,
  lang,
  targetLang,
}: FetchDefinitionParams): Promise<Definition[]> {
  try {
    const openai = getOpenAIClient();
    const target = targetLang && targetLang !== lang ? targetLang : lang;
    const prompt = `Return a concise dictionary definition for the ${lang} word \"${word}\" as STRICT JSON. Requirements:\n1. The array (max 3) items must have keys: pos, sense, examples (array max 2).\n2. The \"sense\" field text MUST be written in ${target}.\n3. The \"examples\" MUST remain in ${lang}.\n4. Keep the \"pos\" value in English.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return [];

    // Extract JSON from content (remove code fences, text before/after)
    const fenceClean = content.replace(/```[a-z]*[\s\n]*([\s\S]*?)```/i, "$1");
    const jsonMatch = fenceClean.match(/\[\s*{[\s\S]*?}\s*]/);
    const jsonString = jsonMatch ? jsonMatch[0] : fenceClean;

    let data: any;
    try {
      data = JSON.parse(jsonString);
    } catch {
      return [];
    }

    if (Array.isArray(data)) {
      return data
        .filter(
          (d) =>
            typeof d.pos === "string" &&
            typeof d.sense === "string" &&
            Array.isArray(d.examples)
        )
        .slice(0, 3) as Definition[];
    }
  } catch (err) {
    console.error("OpenAI definition fetch failed", err);
  }
  return [];
}

/** Translate existing Definition array to target language via OpenAI */
export async function translateDefinitions(
  defs: Definition[],
  targetLang: string
): Promise<Definition[]> {
  if (!targetLang) return defs;
  try {
    const openai = getOpenAIClient();
    const prompt = `Translate ONLY the \"sense\" values of the following JSON array into ${targetLang}. Do NOT change the \"pos\" field. Do NOT translate any text inside the \"examples\" arrays. Return strictly the translated JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      temperature: 0.2,
      messages: [
        { role: "user", content: prompt },
        { role: "user", content: JSON.stringify(defs) },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return defs;
    const jsonString = content.replace(/^```json[\s\n]*|```$/g, "");
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) return data as Definition[];
  } catch (err) {
    console.error("Definition translation failed", err);
  }
  return defs;
}

/** Very small helper to strip HTML tags and basic entities from a string */
export function stripHtml(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/<[^>]+>/g, ""); // remove tags
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.trim();
}
