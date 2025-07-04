import type { Definition, FetchDefinitionParams } from "./types";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// Centralised Gemini model accessor. Defaults to the public flash model but can
// be overridden via env (e.g. GEMINI_MODEL_ID=gemini-2.5-flash-preview-04-17)
const geminiModelId = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash";

function getGeminiModel() {
  return google(geminiModelId);
}

async function runGeminiPrompt(prompt: string, temperature: number = 0.2) {
  const { text } = await generateText({
    model: getGeminiModel(),
    prompt,
    temperature,
  });
  return text.trim();
}

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
/*                   LLM fallback with Google Gemini via AI SDK               */
/* -------------------------------------------------------------------------- */

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
    const target = targetLang && targetLang !== lang ? targetLang : lang;
    const prompt = `Return a concise dictionary definition for the ${lang} word \"${word}\" as STRICT JSON. Requirements:\n1. The array (max 3) items must have keys: pos, sense, examples (array max 2).\n2. The \"sense\" field text MUST be written in ${target}.\n3. The \"examples\" MUST remain in ${lang}.\n4. Keep the \"pos\" value in English.`;

    const content = await runGeminiPrompt(prompt, 0.2);
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

/* -------------------------------------------------------------------------- */
/*                 Helper to translate "sense" field into target               */
/* -------------------------------------------------------------------------- */

/** Translate ONLY the "sense" fields of existing Definition objects into targetLang via OpenAI.
 *  Keeps part-of-speech and examples intact. If translation fails, returns input.
 */
export async function translateDefinitions(
  defs: Definition[],
  targetLang: string
): Promise<Definition[]> {
  if (!targetLang || defs.length === 0) return defs;
  try {
    const prompt = `Translate ONLY the \"sense\" values of each item in the following JSON array into ${targetLang}. Keep the \"pos\" and \"examples\" fields unchanged. Return ONLY the translated JSON array.`;

    const content = await runGeminiPrompt(
      `${prompt}\n${JSON.stringify(defs)}`,
      0.2
    );
    if (!content) return defs;

    const fenceClean = content.replace(/```[a-z]*[\s\n]*([\s\S]*?)```/i, "$1");
    let data: any;
    try {
      data = JSON.parse(fenceClean);
    } catch {
      return defs;
    }

    if (Array.isArray(data)) {
      return data as Definition[];
    }
  } catch (err) {
    console.error("Definition translation failed", err);
  }
  return defs;
}

/* -------------------------------------------------------------------------- */
/*                     Generate example sentences via GPT                      */
/* -------------------------------------------------------------------------- */

/**
 * Ensure each definition has at least one example sentence. If an item has fewer
 * than `minExamples`, we ask OpenAI to generate up to `maxExamples` examples in
 * the original word language (not targetLang!).
 */
export async function fillMissingExamples(
  defs: Definition[],
  lang: string,
  { minExamples = 1, maxExamples = 2 } = {}
): Promise<Definition[]> {
  const needGeneration = defs.some(
    (d) => (d.examples ?? []).length < minExamples
  );
  if (!needGeneration) return defs;

  try {
    const prompt = `You are a lexicographer. For each JSON object with keys pos and sense, add an \"examples\" array with up to ${maxExamples} example sentences written in ${lang}. Do NOT translate or change the sense text. Keep the JSON structure identical.`;

    const content = await runGeminiPrompt(
      `${prompt}\n${JSON.stringify(defs)}`,
      0.2
    );
    if (!content) return defs;

    const fenceClean = content.replace(/```[a-z]*[\s\n]*([\s\S]*?)```/i, "$1");
    let data: any;
    try {
      data = JSON.parse(fenceClean);
    } catch {
      return defs;
    }

    if (Array.isArray(data)) return data as Definition[];
  } catch (err) {
    console.error("Failed to generate example sentences", err);
  }
  return defs;
}
