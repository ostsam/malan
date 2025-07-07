import { isChineseText } from "./chinese-tokenizer";
import { isJapaneseText } from "./chinese-tokenizer-server";

// Type for tokenized words
export interface TokenizedWord {
  word: string;
  language: string;
  // For Japanese: reading (katakana/hiragana) for future furigana support
  reading?: string;
  // For Chinese: isChinese flag
  isChinese?: boolean;
  // For Japanese: isJapanese flag
  isJapanese?: boolean;
  // Original position in text (for spacing preservation)
  start?: number;
  end?: number;
}

// Type for tokenization result with spacing info
export interface TokenizationResult {
  tokens: TokenizedWord[];
  originalText: string;
}

// --- Kuromoji token type (from kuromoji package) ---
interface KuromojiToken {
  word_id: number;
  word_type: "KNOWN" | "UNKNOWN";
  word_position: number;
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading: string;
  pronunciation: string;
}

// --- 1. Chinese tokenization (jieba-wasm) ---
let tokenizeChineseText: ((text: string) => Promise<TokenizedWord[]>) | null =
  null;
async function ensureChineseTokenizer() {
  if (!tokenizeChineseText) {
    const mod = await import("./chinese-tokenizer");
    tokenizeChineseText = mod.tokenizeChineseText;
  }
}

// --- 2. Japanese tokenization (kuromojin, dynamic import) ---
let kuromojinTokenize:
  | ((text: string) => Promise<readonly Readonly<KuromojiToken>[]>)
  | null = null;
async function ensureKuromojin() {
  if (!kuromojinTokenize) {
    try {
      console.log("[tokenizer] Loading kuromojin...");
      const mod = await import("kuromojin");
      console.log("[tokenizer] kuromojin module:", mod);
      kuromojinTokenize = mod.tokenize || mod.default?.tokenize;
      console.log(
        "[tokenizer] kuromojin tokenize function:",
        kuromojinTokenize
      );
    } catch (error) {
      console.error("[tokenizer] Failed to load kuromojin:", error);
      throw error;
    }
  }
}

// --- 3. jslingua for other languages ---
// @ts-ignore - jslingua doesn't have type definitions
let JsLingua: any = null;
async function ensureJsLingua() {
  if (!JsLingua) {
    // @ts-ignore - jslingua doesn't have type definitions
    JsLingua = (await import("jslingua")).default || (await import("jslingua"));
  }
}

// --- 4. Regex fallback ---
function regexTokenize(text: string): TokenizedWord[] {
  console.log("[tokenizer] regexTokenize called with text:", text);

  // Detect script type to use appropriate tokenization
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasKorean = /[\uac00-\ud7af]/.test(text);
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const hasHebrew = /[\u0590-\u05ff]/.test(text);
  const hasThai = /[\u0e00-\u0e7f]/.test(text);
  const hasDevanagari = /[\u0900-\u097f]/.test(text);

  console.log("[tokenizer] Script detection:", {
    hasChinese,
    hasJapanese,
    hasKorean,
    hasArabic,
    hasHebrew,
    hasThai,
    hasDevanagari,
  });

  let words: string[] = [];

  if (hasChinese || hasJapanese) {
    // For Chinese and Japanese, split by character (each character is a word)
    // This is a fallback when the proper tokenizers fail
    words = text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || [];
  } else if (hasKorean) {
    // For Korean, split by syllable blocks
    words = text.match(/[\uac00-\ud7af]+/g) || [];
  } else if (hasArabic || hasHebrew) {
    // For Arabic and Hebrew, split by word boundaries (these scripts have spaces)
    words = text.split(/\s+/).flatMap((sentence) => {
      const wordMatches =
        sentence.match(/[\u0600-\u06ff\u0590-\u05ff]+/g) || [];
      return wordMatches;
    });
  } else if (hasThai || hasDevanagari) {
    // For Thai and Devanagari, split by word boundaries
    words = text.split(/\s+/).flatMap((sentence) => {
      const wordMatches =
        sentence.match(/[\u0e00-\u0e7f\u0900-\u097f]+/g) || [];
      return wordMatches;
    });
  } else {
    // For Latin scripts, use word boundaries
    words = text.split(/\s+/).flatMap((sentence) => {
      const wordMatches = sentence.match(/\b[\p{L}\p{N}']+\b/gu) || [];
      return wordMatches;
    });
  }

  console.log("[tokenizer] regexTokenize words:", words);

  // Find positions for each word, avoiding overlaps
  const result: TokenizedWord[] = [];
  let lastEnd = 0;

  words.forEach((word) => {
    // Find the next occurrence of this word after the last processed position
    const start = text.indexOf(word, lastEnd);
    if (start >= 0) {
      result.push({
        word: word.trim(),
        language: "unknown",
        start: start,
        end: start + word.length,
      });
      lastEnd = start + word.length;
    }
  });

  console.log("[tokenizer] regexTokenize result:", result);
  return result;
}

// --- Japanese fallback tokenization ---
function japaneseFallbackTokenize(text: string): TokenizedWord[] {
  console.log("[tokenizer] Using Japanese fallback tokenization for:", text);

  // Better Japanese word boundary detection
  // Split by:
  // - Hiragana sequences (but separate particles and verb endings)
  // - Katakana sequences
  // - Kanji sequences
  // - Punctuation and other characters

  // Common Japanese particles and verb endings to split on
  const particles =
    /(は|が|を|に|へ|で|から|まで|より|の|と|や|か|ね|よ|な|だ|です|ます|でした|ました|できる|こと|もの|ところ|ため|ように|として|について|によって|によって|について|として|ように|ため|ところ|もの|こと|できる|ます|です|だ|な|よ|ね|か|や|と|の|より|まで|から|で|へ|に|を|が|は)/g;

  // First, split by particles and verb endings
  let segments = text.split(particles);
  console.log("[tokenizer] Initial segments after particle split:", segments);

  // Then process each segment for further tokenization
  const words: string[] = [];
  segments.forEach((segment) => {
    if (!segment.trim()) return;

    // Split each segment by script type
    const subWords =
      segment.match(
        /[\u3040-\u309f]+|[\u30a0-\u30ff]+|[\u4e00-\u9fff]+|[^\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s]+/g
      ) || [];
    words.push(...subWords);
  });

  console.log("[tokenizer] Japanese fallback words:", words);

  const result: TokenizedWord[] = [];
  let lastEnd = 0;

  words.forEach((word) => {
    const start = text.indexOf(word, lastEnd);
    if (start >= 0) {
      console.log("[tokenizer] Japanese fallback token:", {
        word,
        start,
        end: start + word.length,
      });
      result.push({
        word: word.trim(),
        language: "ja",
        isJapanese: true,
        start: start,
        end: start + word.length,
      });
      lastEnd = start + word.length;
    }
  });

  console.log("[tokenizer] Japanese fallback result:", result);
  return result;
}

// --- Improved Japanese text detection ---
function isJapaneseTextImproved(text: string): boolean {
  // Check for Hiragana (ひらがな) - most common in Japanese
  const hasHiragana = /[\u3040-\u309f]/.test(text);
  // Check for Katakana (カタカナ) - also common in Japanese
  const hasKatakana = /[\u30a0-\u30ff]/.test(text);
  // Check for Kanji (漢字) - present in both Chinese and Japanese
  const hasKanji = /[\u4e00-\u9fff]/.test(text);

  console.log("[tokenizer] Japanese detection:", {
    hasHiragana,
    hasKatakana,
    hasKanji,
  });

  // If Hiragana or Katakana is present, it's definitely Japanese
  if (hasHiragana || hasKatakana) {
    console.log(
      "[tokenizer] Detected as Japanese due to Hiragana/Katakana presence"
    );
    return true;
  }

  // If only Kanji is present, it could be Chinese or Japanese
  // For now, we'll treat it as potentially Japanese if the language code is 'ja'
  if (hasKanji) {
    console.log(
      "[tokenizer] Only Kanji detected - could be Chinese or Japanese"
    );
    return false; // Let the language code decide
  }

  return false;
}

// --- Main tokenization function ---
export async function tokenizeText(
  text: string,
  lang: string
): Promise<TokenizedWord[]> {
  console.log("[tokenizer] tokenizeText called with:", { text, lang });

  if (!text || typeof text !== "string") {
    console.log("[tokenizer] Empty or invalid text, returning empty array");
    return [];
  }

  // 1. Japanese (check BEFORE Chinese since Japanese can contain Kanji)
  if (lang === "ja" || isJapaneseTextImproved(text)) {
    console.log("[tokenizer] Processing as Japanese text");
    console.log("[tokenizer] Language code:", lang);
    console.log(
      "[tokenizer] isJapaneseTextImproved result:",
      isJapaneseTextImproved(text)
    );
    console.log("[tokenizer] Text to tokenize:", text);

    try {
      await ensureKuromojin();
      console.log("[tokenizer] kuromojin loaded successfully");

      if (!kuromojinTokenize) {
        throw new Error("kuromojinTokenize is not available after loading");
      }

      const tokens = await kuromojinTokenize(text);
      console.log("[tokenizer] kuromojin raw tokens:", tokens);

      if (!tokens || tokens.length === 0) {
        console.log(
          "[tokenizer] kuromojin returned no tokens, falling back to Japanese fallback"
        );
        return japaneseFallbackTokenize(text);
      }

      // Each token has surface_form, reading, pos, word_position, etc.
      const result = tokens.map((token: Readonly<KuromojiToken>) => {
        console.log("[tokenizer] Processing kuromoji token:", token);
        const resultToken = {
          word: token.surface_form,
          language: "ja",
          reading: token.reading || undefined, // For future furigana
          isJapanese: true,
          start: token.word_position - 1, // kuromoji uses 1-based indexing
          end: token.word_position - 1 + token.surface_form.length,
        };
        console.log("[tokenizer] Created result token:", resultToken);
        return resultToken;
      });

      console.log("[tokenizer] Japanese tokenization result:", result);
      return result;
    } catch (error) {
      console.error("[tokenizer] Error in Japanese tokenization:", error);
      console.error("[tokenizer] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        text: text.substring(0, 100) + "...",
      });
      // Fallback to Japanese-specific tokenization
      console.log("[tokenizer] Falling back to Japanese fallback tokenization");
      return japaneseFallbackTokenize(text);
    }
  }

  // 2. Chinese (check AFTER Japanese)
  if (lang === "zh" || isChineseText(text)) {
    console.log("[tokenizer] Processing as Chinese text");
    console.log("[tokenizer] Language code:", lang);
    console.log("[tokenizer] isChineseText result:", isChineseText(text));

    await ensureChineseTokenizer();
    const result = (await tokenizeChineseText!(text)).map((t) => ({
      ...t,
      language: "zh",
      isChinese: true,
    }));
    console.log("[tokenizer] Chinese tokenization result:", result);
    return result;
  }

  // 3. jslingua for other supported languages
  console.log("[tokenizer] Attempting jslingua for language:", lang);
  await ensureJsLingua();
  try {
    // Check if jslingua supports this language
    // @ts-ignore - jslingua doesn't have type definitions
    const supportedLangs = JsLingua.gserv && JsLingua.gserv("lang");
    console.log("[tokenizer] jslingua supported languages:", supportedLangs);

    // @ts-ignore - jslingua doesn't have type definitions
    const langService = JsLingua.gserv && JsLingua.gserv("lang", lang);
    console.log("[tokenizer] jslingua langService:", langService);
    if (langService && langService.gwords) {
      // @ts-ignore - jslingua doesn't have type definitions
      const words = langService.gwords(text);
      console.log("[tokenizer] jslingua raw words:", words);
      // For jslingua, we need to find positions manually
      const result = words.map((word: string) => {
        const start = text.indexOf(word);
        return {
          word,
          language: lang,
          start: start >= 0 ? start : undefined,
          end: start >= 0 ? start + word.length : undefined,
        };
      });
      console.log("[tokenizer] jslingua result:", result);
      return result;
    } else {
      console.log(
        "[tokenizer] jslingua langService or gwords not available for language:",
        lang
      );
    }
  } catch (e) {
    console.log("[tokenizer] jslingua failed, falling back to regex:", e);
    // jslingua fallback to regex
  }

  // 4. Regex fallback
  console.log("[tokenizer] Using regex fallback");
  const result = regexTokenize(text);
  console.log("[tokenizer] Regex fallback result:", result);
  return result;
}

// --- Extension point: For future furigana support ---
// When you want to display furigana, use the `reading` field from Japanese tokens.
// You can map kanji to reading using the output of kuromojin.
