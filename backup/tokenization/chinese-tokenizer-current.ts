/**
 * Chinese Word Segmentation Utility
 *
 * This module provides intelligent word segmentation for Chinese text using jieba-wasm.
 * Following the official documentation: https://www.npmjs.com/package/jieba-wasm
 */

// Import jieba-wasm following the official documentation
import init, { cut } from "jieba-wasm";

// Module state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

export interface TokenizedWord {
  word: string;
  language: string;
  isChinese?: boolean;
}

/**
 * Initialize jieba-wasm (required before use)
 */
async function initializeJieba(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log("[chinese-tokenizer] Initializing jieba-wasm...");
      await init();
      isInitialized = true;
      console.log("[chinese-tokenizer] jieba-wasm initialized successfully");
    } catch (error) {
      console.error(
        "[chinese-tokenizer] Failed to initialize jieba-wasm:",
        error
      );
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if text contains Chinese characters
 * This function is server-safe and doesn't require jieba-wasm
 */
export function isChineseText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Check if text contains Japanese characters (Hiragana, Katakana, Kanji)
 * This function is server-safe and doesn't require jieba-wasm
 */
export function isJapaneseText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(text);
}

/**
 * Extract Chinese words from text using simple character-based segmentation
 * This is a server-safe fallback that doesn't require jieba-wasm
 */
export function extractChineseWordsSimple(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // Simple character-based segmentation for server-side use
  // This is not as accurate as jieba but works for basic word extraction
  const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
  return chineseChars;
}

/**
 * Tokenize Chinese text using jieba-wasm
 * Following the official documentation pattern
 */
export async function tokenizeChineseText(
  text: string
): Promise<TokenizedWord[]> {
  console.log("[chinese-tokenizer] tokenizeChineseText input:", text);

  try {
    // Ensure jieba-wasm is initialized
    await initializeJieba();

    // Use the cut function as documented
    const tokens = cut(text, true);
    console.log("[chinese-tokenizer] jieba-wasm cut result:", tokens);

    // Convert tokens to our format
    const result = tokens.map((token: string) => ({
      word: token,
      language: "zh",
      isChinese: isChineseText(token),
    }));

    console.log("[chinese-tokenizer] Final tokenization result:", result);
    return result;
  } catch (error) {
    console.error("[chinese-tokenizer] Error tokenizing Chinese text:", error);

    // Fallback: return the entire text as a single token
    return [
      {
        word: text,
        language: "zh",
        isChinese: true,
      },
    ];
  }
}

/**
 * Extract Chinese words from text (returns array of strings)
 * Uses jieba-wasm when available, falls back to simple extraction
 */
export async function extractChineseWords(text: string): Promise<string[]> {
  try {
    const tokens = await tokenizeChineseText(text);
    return tokens.map((token) => token.word);
  } catch (error) {
    console.error(
      "[chinese-tokenizer] Error in extractChineseWords, using fallback:",
      error
    );
    // Fallback to simple extraction for server-side use
    return extractChineseWordsSimple(text);
  }
}

/**
 * Tokenize text (supports Chinese and other languages)
 */
export async function tokenizeText(text: string): Promise<TokenizedWord[]> {
  if (!text || typeof text !== "string") {
    return [];
  }

  if (isChineseText(text)) {
    return await tokenizeChineseText(text);
  }

  // For non-Chinese text, return as single token
  return [
    {
      word: text,
      language: "unknown",
      isChinese: false,
    },
  ];
}

/**
 * Check if a character is a Chinese character
 * This function is server-safe and doesn't require jieba-wasm
 */
export function isChineseCharacter(char: string): boolean {
  if (!char || char.length !== 1) return false;
  return /[\u4e00-\u9fff]/.test(char);
}
