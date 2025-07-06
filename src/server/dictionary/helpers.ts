import type { Definition, FetchDefinitionParams } from "./types";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Centralised Gemini model accessor. Defaults to the public flash model but can
// be overridden via env (e.g. GEMINI_MODEL_ID=gemini-2.5-flash-preview-04-17)
const geminiModelId =
  process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite-preview-06-17";

// Log Gemini configuration for debugging
console.log("[GEMINI_CONFIG]", {
  modelId: geminiModelId,
  hasApiKey: !!process.env.GOOGLE_API_KEY,
  apiKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
});

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

// ---------------------------------------------------------------------------
//                      OpenAI (GPT) model helpers
// ---------------------------------------------------------------------------

const openaiModelId = process.env.OPENAI_MODEL_ID || "gpt-3.5-turbo";

function getOpenAiModel() {
  return openai(openaiModelId);
}

async function runOpenAiPrompt(prompt: string, temperature: number = 0.2) {
  const { text } = await generateText({
    model: getOpenAiModel(),
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
 * Fetch a concise dictionary definition using Google Gemini. Used as default provider.
 * The model is prompted to return STRICT JSON that matches Definition[] shape.
 */
export async function fetchGeminiDefinition({
  word,
  lang,
  targetLang,
}: FetchDefinitionParams): Promise<Definition[]> {
  try {
    const target = targetLang && targetLang !== lang ? targetLang : lang;
    const prompt = `Return a concise dictionary definition for the ${lang} word \"${word}\" as STRICT JSON.
    \nRules:
    1. The response MUST be a JSON array (no code fences) of up to 3 objects, each with keys: pos, sense, examples (max 2).
    2. Only include MORE THAN ONE object when the word genuinely has multiple distinct meanings. If there is a single meaning, the array must contain exactly ONE object.
    3. The \"sense\" text must be written entirely in ${target}. Do NOT include any English or other-language glosses, parentheses, or abbreviations.
    4. The example sentences MUST remain in ${lang}.
    5. The \"pos\" value stays in English (e.g. \"verb\", \"noun\").`;

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
      const processed = postProcessDefinitions(
        data.filter(
          (d) =>
            typeof d.pos === "string" &&
            typeof d.sense === "string" &&
            Array.isArray(d.examples)
        ) as Definition[],
        word
      );
      return processed.slice(0, 3);
    }
  } catch (err) {
    console.error("Gemini definition fetch failed", err);
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

/** Translate ONLY the "sense" fields of existing Definition objects into targetLang via LLMs.
 *  Keeps part-of-speech and examples intact. If translation fails, returns input.
 *  Logs all translation attempts and falls back to OpenAI if Gemini fails.
 */
export async function translateDefinitions(
  defs: Definition[],
  targetLang: string,
  sourceLang?: string
): Promise<Definition[]> {
  if (!targetLang || defs.length === 0) return defs;

  // Helper to log translation attempts
  function logTranslation({
    original,
    prompt,
    geminiResult,
    openaiResult,
    used,
  }: {
    original: string;
    prompt: string;
    geminiResult?: string;
    openaiResult?: string;
    used: "gemini" | "openai" | "none";
  }) {
    console.log("[LLM_TRANSLATE]", {
      original,
      prompt,
      geminiResult,
      openaiResult,
      used,
    });
  }

  try {
    // Translate each definition individually for better reliability
    const translatedDefs = await Promise.all(
      defs.map(async (def) => {
        const srcLang = sourceLang || "the original language";
        const prompt = `Translate the following dictionary definition from ${srcLang} to ${targetLang} for a language learner. Return ONLY the translation, nothing else:\n\nDefinition: "${def.sense}"\n\nTranslation:`;
        let geminiResult: string | undefined = undefined;
        let openaiResult: string | undefined = undefined;
        let used: "gemini" | "openai" | "none" = "none";
        try {
          console.log("[LLM_TRANSLATE] Attempting Gemini translation...");
          geminiResult = await runGeminiPrompt(prompt, 0.2);
          console.log(
            "[LLM_TRANSLATE] Gemini response:",
            geminiResult
              ? `"${geminiResult.substring(0, 100)}..."`
              : "null/empty"
          );

          if (geminiResult && geminiResult.trim()) {
            used = "gemini";
            logTranslation({
              original: def.sense,
              prompt,
              geminiResult,
              openaiResult: undefined,
              used,
            });
            return {
              ...def,
              translatedSense: geminiResult.trim(),
            };
          } else {
            console.log(
              "[LLM_TRANSLATE] Gemini returned empty/invalid response, falling back to OpenAI"
            );
          }
        } catch (err) {
          console.error("[LLM_TRANSLATE] Gemini failed:", err);
          console.error("[LLM_TRANSLATE] Gemini error details:", {
            message: err.message,
            code: err.code,
            status: err.status,
          });
        }
        // Fallback to OpenAI if Gemini fails
        try {
          openaiResult = await runOpenAiPrompt(prompt, 0.2);
          if (openaiResult && openaiResult.trim()) {
            used = "openai";
            logTranslation({
              original: def.sense,
              prompt,
              geminiResult,
              openaiResult,
              used,
            });
            return {
              ...def,
              translatedSense: openaiResult.trim(),
            };
          }
        } catch (err) {
          console.error("[LLM_TRANSLATE] OpenAI failed:", err);
        }
        // Log failure
        logTranslation({
          original: def.sense,
          prompt,
          geminiResult,
          openaiResult,
          used,
        });
        return def; // Return original if translation fails
      })
    );
    return translatedDefs;
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

/* -------------------------------------------------------------------------- */
/*                     Fallback: Fetch definition via OpenAI                  */
/* -------------------------------------------------------------------------- */

export async function fetchOpenAiDefinition({
  word,
  lang,
  targetLang,
}: FetchDefinitionParams): Promise<Definition[]> {
  try {
    const target = targetLang && targetLang !== lang ? targetLang : lang;
    const prompt = `Return a concise dictionary definition for the ${lang} word \"${word}\" as STRICT JSON. Requirements:\n1. The array (max 3) items must have keys: pos, sense, examples (array max 2).\n2. The \"sense\" field text MUST be written in ${target}.\n3. The \"examples\" MUST remain in ${lang}.\n4. Keep the \"pos\" value in English.`;

    const content = await runOpenAiPrompt(prompt, 0.2);
    if (!content) return [];

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

/* -------------------------------------------------------------------------- */
/*               Local post-processing: dedupe senses & clean examples        */
/* -------------------------------------------------------------------------- */

function normalise(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[^\p{L}\s]+/gu, "")
    .toLowerCase()
    .trim();
}

function dedupe(defs: Definition[]): Definition[] {
  const seen = new Set<string>();
  return defs.filter((d) => {
    const key = normalise(d.sense).slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanExamples(defs: Definition[], word: string): Definition[] {
  const re = new RegExp(`\\b${word}\\b`, "i");
  return defs.map((d) => {
    const ex = (d.examples || []).filter((e) => re.test(e));
    return { ...d, examples: ex.slice(0, 2) };
  });
}

function collapseIfSame(defs: Definition[]): Definition[] {
  if (defs.length <= 1) return defs;
  const firstStem = normalise(defs[0].sense).split(" ").slice(0, 4).join(" ");
  const allSame = defs.every(
    (d) => normalise(d.sense).split(" ").slice(0, 4).join(" ") === firstStem
  );
  return allSame ? [defs[0]] : defs;
}

function postProcessDefinitions(
  defs: Definition[],
  word: string
): Definition[] {
  let out = dedupe(defs);
  out = collapseIfSame(out);
  out = cleanExamples(out, word);
  return out;
}
