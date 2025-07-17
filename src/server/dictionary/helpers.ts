import type { Definition, FetchDefinitionParams } from "./types";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Centralised Gemini model accessor. Defaults to the public flash model but can
// be overridden via env (e.g. GEMINI_MODEL_ID=gemini-2.5-flash-preview-04-17)
const geminiModelId =
  process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite-preview-06-17";

function getGeminiModel() {
  return google(geminiModelId);
}

async function runGeminiPrompt(prompt: string, temperature: number = 0.2) {
  const { text } = await generateText({
    model: getGeminiModel(),
    prompt,
    temperature,
    maxTokens: 500,
  });
  return text.trim();
}

// ---------------------------------------------------------------------------
//                      OpenAI (GPT) model helpers
// ---------------------------------------------------------------------------

const openaiModelId = process.env.OPENAI_MODEL_ID || "gpt-4.1-nano";

function getOpenAiModel() {
  return openai(openaiModelId);
}

async function runOpenAiPrompt(prompt: string, temperature: number = 0.2) {
  const { text } = await generateText({
    model: getOpenAiModel(),
    prompt,
    temperature,
    maxTokens: 500,
  });
  return text.trim();
}

/**
 * Extract up to the first three definitions from the Wiktionary REST API JSON
 * keeping at most two example sentences for each.
 */
export function parseWiktionary(
  json: unknown,
  filterLang?: string
): Definition[] {
  const result: Definition[] = [];

  if (!json || typeof json !== "object") return result;

  // The Wiktionary REST response groups entries by language code key.
  // Each value is an array of entries with partOfSpeech and definitions arrays.
  Object.entries(json as Record<string, unknown>).forEach(
    ([langKey, entries]) => {
      if (filterLang && langKey.toLowerCase() !== filterLang.toLowerCase())
        return;

      if (!Array.isArray(entries)) return;

      entries.forEach((entry: unknown) => {
        if (result.length >= 3) return; // stop early
        if (!entry || typeof entry !== "object") return;
        const e = entry as {
          partOfSpeech?: string;
          pos?: string;
          definitions?: unknown[];
        };
        const pos: string = e.partOfSpeech || e.pos || "unknown";
        const defs = Array.isArray(e.definitions) ? e.definitions : [];

        defs.forEach((d: unknown) => {
          if (result.length >= 3) return;
          if (!d || (typeof d !== "string" && typeof d !== "object")) return;
          const defObj =
            typeof d === "string"
              ? { definition: d }
              : (d as {
                  definition?: string;
                  meaning?: string;
                  examples?: unknown[];
                });
          const rawSense: string =
            typeof d === "string"
              ? d
              : defObj.definition || defObj.meaning || "";
          const sense = stripHtml(rawSense);
          if (!sense) return;

          const examplesRaw = defObj.examples || [];
          const examples: string[] = (examplesRaw as unknown[])
            .map((e) => {
              const exampleText =
                typeof e === "string"
                  ? e
                  : (
                      e as {
                        example?: string;
                        text?: string;
                        translation?: string;
                      }
                    ).example ||
                    (
                      e as {
                        example?: string;
                        text?: string;
                        translation?: string;
                      }
                    ).text ||
                    (
                      e as {
                        example?: string;
                        text?: string;
                        translation?: string;
                      }
                    ).translation ||
                    "";
              return stripHtml(exampleText);
            })
            .filter(Boolean)
            .slice(0, 2);

          result.push({ pos, sense, examples });
        });
      });
    }
  );

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

    let data: unknown;
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

  // Helper to log translation attempts (minimal logging)
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
    // Only log failures or if verbose logging is enabled
    if (used === "none") {
      console.warn(`[LLM_TRANSLATE] Failed to translate: "${original.substring(0, 50)}..."`);
    }
  }

  try {
    // Translate each definition individually for better reliability
    const translatedDefs = await Promise.all(
      defs.map(async (def) => {
        const srcLang = sourceLang || "the original language";
        const prompt = `Translate the following dictionary definition from ${srcLang} to ${targetLang} for a language learner.

Original definition: "${def.sense}"

Provide the idiomatic translation of the word in ${targetLang} followed by a clear definition in parentheses. Format: "idiomatic_translation (clear definition in target language)". The idiomatic translation should be the natural way to express this concept. Preserve the register (formality level) of the original word. If the original is formal, use a formal equivalent. If it's casual, use a casual equivalent. Only simplify if the original is unnecessarily complex for learners.

IMPORTANT: For function words (conjunctions, prepositions, articles, etc.), give the actual word that native speakers use, not a grammatical description. For example:
- Use "and" not "conjunction"
- Use "in" not "preposition"
- Use "the" not "definite article"
- Use "but" not "coordinating conjunction"

Return ONLY the translation in this format, nothing else.

Translation:`;
        let geminiResult: string | undefined = undefined;
        let openaiResult: string | undefined = undefined;
        let used: "gemini" | "openai" | "none" = "none";
        try {
          geminiResult = await runGeminiPrompt(prompt, 0.2);

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
            message: err instanceof Error ? err.message : String(err),
            code: (err as Error & { code?: string })?.code,
            status: (err as Error & { status?: number })?.status,
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
    let data: unknown;
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

    let data: unknown;
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

/* -------------------------------------------------------------------------- */
/*                 Enhanced Language Detection & Correction                   */
/* -------------------------------------------------------------------------- */

// Comprehensive language script detection patterns
const LANGUAGE_SCRIPTS: Record<string, RegExp> = {
  // Latin-based languages
  en: /[a-zA-Z]/,
  es: /[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/,
  fr: /[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/,
  de: /[a-zA-ZäöüßÄÖÜ]/,
  it: /[a-zA-ZàèéìíîòóùÀÈÉÌÍÎÒÓÙ]/,
  pt: /[a-zA-ZáâãàçéêíóôõúÁÂÃÀÇÉÊÍÓÔÕÚ]/,
  nl: /[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ]/,

  // Cyrillic languages
  ru: /[а-яА-ЯёЁ]/,
  uk: /[а-яА-ЯіїєґІЇЄҐ]/,
  bg: /[а-яА-Я]/,

  // Asian languages
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/, // Hiragana, Katakana, Kanji
  zh: /[\u4E00-\u9FFF]/, // Chinese Han characters
  ko: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/, // Hangul, Jamo
  th: /[\u0E00-\u0E7F]/, // Thai

  // Middle Eastern languages
  ar: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/, // Arabic
  fa: /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/, // Persian/Farsi
  he: /[\u0590-\u05FF\uFB1D-\uFB4F]/, // Hebrew

  // Other scripts
  hi: /[\u0900-\u097F]/, // Devanagari (Hindi)
  bn: /[\u0980-\u09FF]/, // Bengali
  ta: /[\u0B80-\u0BFF]/, // Tamil
  te: /[\u0C00-\u0C7F]/, // Telugu
  kn: /[\u0C80-\u0CFF]/, // Kannada
  ml: /[\u0D00-\u0D7F]/, // Malayalam
  gu: /[\u0A80-\u0AFF]/, // Gujarati
  pa: /[\u0A00-\u0A7F]/, // Gurmukhi (Punjabi)
  ur: /[\u0600-\u06FF\u0750-\u077F]/, // Urdu (Arabic script)
  tr: /[a-zA-ZçğıöşüÇĞIİÖŞÜ]/, // Turkish
  sv: /[a-zA-ZåäöÅÄÖ]/, // Swedish
  da: /[a-zA-ZæøåÆØÅ]/, // Danish
  no: /[a-zA-ZæøåÆØÅ]/, // Norwegian
  fi: /[a-zA-ZäöåÄÖÅ]/, // Finnish
  pl: /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/, // Polish
  cs: /[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/, // Czech
  sk: /[a-zA-ZáäčďéíľĺňóôŕšťúýžÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/, // Slovak
  hu: /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/, // Hungarian
  ro: /[a-zA-ZăâîșțĂÂÎȘȚ]/, // Romanian
  hr: /[a-zA-ZčćđšžČĆĐŠŽ]/, // Croatian
  sr: /[а-яА-ЯčćđšžČĆĐŠŽ]/, // Serbian (both Cyrillic and Latin)
  sl: /[a-zA-ZčšžČŠŽ]/, // Slovenian
  et: /[a-zA-ZäöõüšžÄÖÕÜŠŽ]/, // Estonian
  lv: /[a-zA-ZāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]/, // Latvian
  lt: /[a-zA-ZąčęėįšųūžĄČĘĖĮŠŲŪŽ]/, // Lithuanian
  el: /[\u0370-\u03FF\u1F00-\u1FFF]/, // Greek
};

// Common English words that might appear in definitions
const COMMON_ENGLISH_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "must",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "we",
  "us",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "i",
  "me",
  "my",
  "mine",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "person",
  "place",
  "thing",
  "action",
  "quality",
  "state",
  "condition",
  "process",
  "result",
]);

/**
 * Detect the language of a text using script patterns and word analysis
 */
export function detectLanguage(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const normalizedText = text.toLowerCase().trim();
  const detectedLanguages: string[] = [];

  // Check each language script
  for (const [langCode, regex] of Object.entries(LANGUAGE_SCRIPTS)) {
    if (regex.test(text)) {
      detectedLanguages.push(langCode);
    }
  }

  // Special case: if no script detected but contains common English words, likely English
  if (detectedLanguages.length === 0) {
    const words = normalizedText.split(/\s+/);
    const englishWordCount = words.filter((word) =>
      COMMON_ENGLISH_WORDS.has(word)
    ).length;
    if (englishWordCount > 0 && englishWordCount / words.length > 0.3) {
      detectedLanguages.push("en");
    }
  }

  return detectedLanguages;
}

/**
 * Check if definitions are in the expected language
 */
export function validateDefinitionLanguage(
  defs: Definition[],
  expectedLang: string
): {
  isValid: boolean;
  detectedLanguages: string[];
  invalidDefinitions: Definition[];
} {
  const invalidDefinitions: Definition[] = [];
  const allDetectedLanguages: string[] = [];

  for (const def of defs) {
    const detectedLanguages = detectLanguage(def.sense);
    allDetectedLanguages.push(...detectedLanguages);

    // Check if the detected language matches expected language
    if (
      detectedLanguages.length === 0 ||
      !detectedLanguages.includes(expectedLang)
    ) {
      invalidDefinitions.push(def);
    }
  }

  const isValid = invalidDefinitions.length === 0;

  return {
    isValid,
    detectedLanguages: [...new Set(allDetectedLanguages)],
    invalidDefinitions,
  };
}

/**
 * Automatically correct definitions that are in the wrong language
 */
export async function correctDefinitionLanguage(
  defs: Definition[],
  expectedLang: string,
  word: string,
  targetLang?: string
): Promise<{
  corrected: Definition[];
  corrections: Array<{ original: string; corrected: string; reason: string }>;
}> {
  const corrections: Array<{
    original: string;
    corrected: string;
    reason: string;
  }> = [];
  const correctedDefs: Definition[] = [];

  for (const def of defs) {
    const detectedLanguages = detectLanguage(def.sense);

    // If definition is in wrong language, regenerate it
    if (
      detectedLanguages.length === 0 ||
      !detectedLanguages.includes(expectedLang)
    ) {
      console.log(`[LANG_CORRECTION] Definition in wrong language detected:`, {
        word,
        expectedLang,
        detectedLanguages,
        originalSense: def.sense.substring(0, 100),
      });

      try {
        // Generate new definition in correct language
        const newDefs = await fetchGeminiDefinition({
          word,
          lang: expectedLang,
          targetLang: undefined, // Get definition in the expected language
        });

        if (newDefs.length > 0) {
          // Find matching definition by part of speech
          const matchingDef =
            newDefs.find((d) => d.pos === def.pos) || newDefs[0];

          corrections.push({
            original: def.sense,
            corrected: matchingDef.sense,
            reason: `Language mismatch: detected ${detectedLanguages.join(", ")} but expected ${expectedLang}`,
          });

          // If we need translation, generate it
          if (targetLang && targetLang !== expectedLang) {
            const translatedDefs = await translateDefinitions(
              [matchingDef],
              targetLang,
              expectedLang
            );
            if (translatedDefs[0]?.translatedSense) {
              correctedDefs.push({
                ...matchingDef,
                translatedSense: translatedDefs[0].translatedSense,
              });
            } else {
              correctedDefs.push(matchingDef);
            }
          } else {
            correctedDefs.push(matchingDef);
          }

          console.log(`[LANG_CORRECTION] ✅ Corrected definition:`, {
            original: def.sense.substring(0, 50),
            corrected: matchingDef.sense.substring(0, 50),
          });
        } else {
          // If regeneration failed, keep original but log
          console.log(
            `[LANG_CORRECTION] ⚠️ Failed to regenerate definition, keeping original`
          );
          correctedDefs.push(def);
        }
      } catch (error) {
        console.error(
          `[LANG_CORRECTION] ❌ Error correcting definition:`,
          error
        );
        // Keep original definition if correction fails
        correctedDefs.push(def);
      }
    } else {
      // Definition is in correct language, keep as is
      correctedDefs.push(def);
    }
  }

  if (corrections.length > 0) {
    console.log(
      `[LANG_CORRECTION] Summary: corrected ${corrections.length} definitions for word "${word}"`
    );
  }

  return { corrected: correctedDefs, corrections };
}
