"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isChineseText,
  extractChineseWords,
} from "@/lib/chinese-tokenizer-server";
import type { TokenizedWord } from "@/lib/chinese-tokenizer";

// Server-side safety check
const isServer = typeof window === "undefined";

// Dynamic import for client-side only
let tokenizeChineseText: ((text: string) => Promise<TokenizedWord[]>) | null =
  null;
let pinyinPro: any = null;

// Initialize client-side functions only when needed
const initializeClientFunctions = async () => {
  if (isServer) return;

  try {
    const chineseTokenizerModule = await import("@/lib/chinese-tokenizer");
    tokenizeChineseText = chineseTokenizerModule.tokenizeChineseText;
  } catch (error) {
    console.error("Failed to load chinese-tokenizer:", error);
  }
};

// Initialize pinyin-pro
const initializePinyinPro = async () => {
  if (isServer) return;

  try {
    pinyinPro = await import("pinyin-pro");
  } catch (error) {
    console.error("Failed to load pinyin-pro:", error);
  }
};

// Simple cache for tokenization results
const tokenizationCache = new Map<string, TokenizedWordWithPinyin[]>();
const pinyinCache = new Map<string, string>();

// Cache version to force invalidation when defaults change
const PINYIN_CACHE_VERSION = "v2-symbols";

// Enhanced TokenizedWord interface with pinyin
export interface TokenizedWordWithPinyin extends TokenizedWord {
  pinyin?: string;
  tone?: number;
}

// Interface for the combined result
export interface TokenizedTextWithPinyin {
  tokens: TokenizedWordWithPinyin[];
  combinedPinyin: string;
}

/**
 * Hook for Chinese text tokenization with pinyin
 */
export function useCJKTokenizedTextWithPinyin(
  text: string,
  langCode?: string,
  pinyinOptions?: {
    toneType?: "none" | "num" | "symbol";
    pattern?: "pinyin" | "initial" | "final" | "num" | "first";
    removeNonZh?: boolean;
    v?: boolean;
    case?: "lowercase" | "uppercase" | "capitalize";
  }
): {
  tokens: TokenizedWordWithPinyin[] | null;
  combinedPinyin: string | null;
  loading: boolean;
  error: Error | null;
} {
  const [tokens, setTokens] = useState<TokenizedWordWithPinyin[] | null>(null);
  const [combinedPinyin, setCombinedPinyin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("[useCJKTokenizedTextWithPinyin] Processing text:", text);

    if (!text || typeof text !== "string") {
      setTokens(null);
      return;
    }

    // Only process Chinese text
    const isChinese = isChineseText(text);
    if (langCode !== "zh" && !isChinese) {
      setTokens(null);
      return;
    }

    // Check cache first
    const cacheKey = `${PINYIN_CACHE_VERSION}:${text}:${langCode || "unknown"}:${JSON.stringify(pinyinOptions)}`;
    if (tokenizationCache.has(cacheKey)) {
      console.log("[useCJKTokenizedTextWithPinyin] Using cached result");
      setTokens(tokenizationCache.get(cacheKey)!);
      return;
    }

    const tokenize = async () => {
      console.log("[useCJKTokenizedTextWithPinyin] Starting tokenization...");
      setLoading(true);
      setError(null);

      try {
        // Initialize client functions if not already done
        if (!tokenizeChineseText) {
          await initializeClientFunctions();
        }
        if (!pinyinPro) {
          await initializePinyinPro();
        }

        if (!tokenizeChineseText) {
          throw new Error("Failed to initialize tokenization function");
        }
        if (!pinyinPro) {
          throw new Error("Failed to initialize pinyin function");
        }

        // Get tokenized words
        const tokenizedWords = await tokenizeChineseText(text);
        console.log(
          "[useCJKTokenizedTextWithPinyin] Tokenization result:",
          tokenizedWords
        );

        // Add pinyin to each token
        const tokensWithPinyin: TokenizedWordWithPinyin[] = await Promise.all(
          tokenizedWords.map(async (token: TokenizedWord) => {
            if (token.isChinese && token.word) {
              try {
                if (!pinyinPro) throw new Error("pinyinPro not loaded");
                const pinyinResult = pinyinPro.pinyin(token.word, {
                  toneType: pinyinOptions?.toneType || "symbol",
                  pattern: pinyinOptions?.pattern || "pinyin",
                  removeNonZh: pinyinOptions?.removeNonZh || false,
                  v: pinyinOptions?.v || false,
                  case: pinyinOptions?.case || "lowercase",
                });

                // Remove spaces within the token to group pinyin for this word
                const groupedPinyin = pinyinResult.replace(/\s+/g, "");

                return {
                  ...token,
                  pinyin: groupedPinyin,
                };
              } catch (pinyinError) {
                console.warn(
                  `Failed to generate pinyin for "${token.word}":`,
                  pinyinError
                );
                return token;
              }
            }
            return token;
          })
        );

        // Join the pinyin with spaces between tokens to match Jieba boundaries
        const finalPinyin = tokensWithPinyin
          .map((token) => token.pinyin || token.word)
          .join(" ");

        console.log(
          "[useCJKTokenizedTextWithPinyin] Final result with pinyin:",
          tokensWithPinyin
        );
        console.log(
          "[useCJKTokenizedTextWithPinyin] Combined pinyin:",
          finalPinyin
        );

        // Cache the result
        tokenizationCache.set(cacheKey, tokensWithPinyin);

        // Limit cache size
        if (tokenizationCache.size > 50) {
          const firstKey = tokenizationCache.keys().next().value;
          if (firstKey) {
            tokenizationCache.delete(firstKey);
          }
        }

        setTokens(tokensWithPinyin);
        setCombinedPinyin(finalPinyin);
      } catch (err) {
        console.error("[useCJKTokenizedTextWithPinyin] Error:", err);
        setError(err instanceof Error ? err : new Error("Tokenization failed"));
        setTokens(null);
        setCombinedPinyin(null);
      } finally {
        setLoading(false);
      }
    };

    tokenize();
  }, [text, langCode, pinyinOptions]);

  return { tokens, combinedPinyin, loading, error };
}

/**
 * Hook for Chinese pinyin generation using pinyin-pro with Jieba tokenization
 */
export function useChinesePinyin(
  text: string,
  enabled: boolean = true,
  options?: {
    toneType?: "none" | "num" | "symbol";
    pattern?: "pinyin" | "initial" | "final" | "num" | "first";
    removeNonZh?: boolean;
    v?: boolean;
    case?: "lowercase" | "uppercase" | "capitalize";
  }
): {
  pinyin: string;
  loading: boolean;
  error: Error | null;
} {
  const [pinyin, setPinyin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !text || typeof text !== "string" || !isChineseText(text)) {
      setPinyin("");
      return;
    }

    // Check cache first
    const cacheKey = `${PINYIN_CACHE_VERSION}:${text}:${JSON.stringify(options)}`;
    if (pinyinCache.has(cacheKey)) {
      setPinyin(pinyinCache.get(cacheKey)!);
      return;
    }

    const generate = async () => {
      setLoading(true);
      setError(null);
      try {
        // Initialize pinyin-pro if not already done
        if (!pinyinPro) {
          await initializePinyinPro();
        }
        if (!tokenizeChineseText) {
          await initializeClientFunctions();
        }

        if (!pinyinPro) {
          throw new Error("Failed to initialize pinyin-pro");
        }
        if (!tokenizeChineseText) {
          throw new Error("Failed to initialize tokenization function");
        }

        // First tokenize with Jieba to get word boundaries
        const tokenizedWords = await tokenizeChineseText(text);

        // Generate pinyin for each token
        const tokenPinyin = await Promise.all(
          tokenizedWords.map(async (token: TokenizedWord) => {
            if (token.isChinese && token.word) {
              if (!pinyinPro) throw new Error("pinyinPro not loaded");
              const pinyinResult = pinyinPro.pinyin(token.word, {
                toneType: options?.toneType || "symbol",
                pattern: options?.pattern || "pinyin",
                removeNonZh: options?.removeNonZh || false,
                v: options?.v || false,
              });
              // Remove spaces within the token
              return pinyinResult.replace(/\s+/g, "");
            }
            return token.word;
          })
        );

        // Join with spaces between tokens
        const result = tokenPinyin.join(" ");

        // Cache the result
        pinyinCache.set(cacheKey, result);

        // Limit cache size
        if (pinyinCache.size > 100) {
          const firstKey = pinyinCache.keys().next().value;
          if (firstKey) {
            pinyinCache.delete(firstKey);
          }
        }

        setPinyin(result);
      } catch (err) {
        console.error("Error generating pinyin:", err);
        setError(
          err instanceof Error ? err : new Error("Pinyin generation failed")
        );
        setPinyin("");
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [text, enabled, options]);

  return { pinyin, loading, error };
}

/**
 * Hook for generating pinyin for individual Chinese words
 */
export function useChineseWordPinyin(
  word: string,
  enabled: boolean = true,
  options?: {
    toneType?: "none" | "num" | "symbol";
    pattern?: "pinyin" | "initial" | "final" | "num" | "first";
    removeNonZh?: boolean;
    v?: boolean;
    case?: "lowercase" | "uppercase" | "capitalize";
  }
): {
  pinyin: string;
  loading: boolean;
  error: Error | null;
} {
  return useChinesePinyin(word, enabled && isChineseText(word), options);
}

/**
 * Hook for Chinese text tokenization (original, without pinyin)
 */
export function useCJKTokenizedText(
  text: string,
  langCode?: string
): {
  tokens: TokenizedWord[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [tokens, setTokens] = useState<TokenizedWord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("[useCJKTokenizedText] Processing text:", text);

    if (!text || typeof text !== "string") {
      setTokens(null);
      return;
    }

    // Only process Chinese text
    const isChinese = isChineseText(text);
    if (langCode !== "zh" && !isChinese) {
      setTokens(null);
      return;
    }

    // Check cache first
    const cacheKey = `${text}:${langCode || "unknown"}`;
    if (tokenizationCache.has(cacheKey)) {
      console.log("[useCJKTokenizedText] Using cached result");
      setTokens(tokenizationCache.get(cacheKey)!);
      return;
    }

    const tokenize = async () => {
      console.log("[useCJKTokenizedText] Starting tokenization...");
      setLoading(true);
      setError(null);

      try {
        // Initialize client functions if not already done
        if (!tokenizeChineseText) {
          await initializeClientFunctions();
        }

        if (!tokenizeChineseText) {
          throw new Error("Failed to initialize tokenization function");
        }

        const result = await tokenizeChineseText(text);
        console.log("[useCJKTokenizedText] Tokenization result:", result);

        // Cache the result
        tokenizationCache.set(cacheKey, result);

        // Limit cache size
        if (tokenizationCache.size > 50) {
          const firstKey = tokenizationCache.keys().next().value;
          if (firstKey) {
            tokenizationCache.delete(firstKey);
          }
        }

        setTokens(result);
      } catch (err) {
        console.error("[useCJKTokenizedText] Error:", err);
        setError(err instanceof Error ? err : new Error("Tokenization failed"));
        setTokens(null);
      } finally {
        setLoading(false);
      }
    };

    tokenize();
  }, [text, langCode]);

  return { tokens, loading, error };
}

/**
 * Hook for Chinese word extraction
 */
export function useChineseWordExtraction(
  text: string,
  langCode?: string
): {
  words: string[];
  loading: boolean;
  error: Error | null;
} {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!text || typeof text !== "string") {
      setWords([]);
      return;
    }

    // Only process Chinese text
    if (langCode !== "zh" && !isChineseText(text)) {
      setWords([]);
      return;
    }

    const extract = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = extractChineseWords(text);
        setWords(result);
      } catch (err) {
        console.error("[useChineseWordExtraction] Error:", err);
        setError(
          err instanceof Error ? err : new Error("Word extraction failed")
        );
        setWords([]);
      } finally {
        setLoading(false);
      }
    };

    extract();
  }, [text, langCode]);

  return { words, loading, error };
}
