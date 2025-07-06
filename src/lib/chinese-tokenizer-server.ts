/**
 * Server-safe Chinese text utilities
 *
 * This module provides Chinese text detection and basic word extraction
 * without requiring jieba-wasm, making it safe for server-side use.
 */

/**
 * Check if text contains Chinese characters
 */
export function isChineseText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Check if text contains Japanese characters (Hiragana, Katakana, Kanji)
 */
export function isJapaneseText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(text);
}

/**
 * Extract Chinese words from text using simple character-based segmentation
 * This is a server-safe fallback that doesn't require jieba-wasm
 */
export function extractChineseWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // Simple character-based segmentation for server-side use
  // This is not as accurate as jieba but works for basic word extraction
  const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
  return chineseChars;
}

/**
 * Check if a character is a Chinese character
 */
export function isChineseCharacter(char: string): boolean {
  if (!char || char.length !== 1) return false;
  return /[\u4e00-\u9fff]/.test(char);
}
