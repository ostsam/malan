"use client";

import { useState, useEffect } from "react";
import {
  isChineseText,
  extractChineseWords,
} from "@/lib/chinese-tokenizer-server";
import type { TokenizedWord } from "@/lib/chinese-tokenizer";

// Server-side safety check
const isServer = typeof window === "undefined";

// Dynamic import for client-side only
let tokenizeChineseText: any = null;

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

// Simple cache for tokenization results
const tokenizationCache = new Map<string, any[]>();

/**
 * Hook for Chinese text tokenization
 */
export function useCJKTokenizedText(
  text: string,
  langCode?: string
): {
  tokens: any[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [tokens, setTokens] = useState<any[] | null>(null);
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
 * Hook for Chinese pinyin generation
 */
export function useChinesePinyin(
  text: string,
  enabled: boolean = true
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

    const generate = async () => {
      setLoading(true);
      setError(null);
      try {
        // For now, return the original text as placeholder
        // In a real implementation, you'd use pinyin-pro here
        setPinyin(text);
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
  }, [text, enabled]);

  return { pinyin, loading, error };
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
