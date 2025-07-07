"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isChineseText } from "@/lib/chinese-tokenizer-server";

// OPTIMIZATION: Lazy-loaded Chinese tokenization with caching
interface TokenizationCache {
  [key: string]: {
    pinyin: string;
    timestamp: number;
  };
}

// Global cache shared across all components
const globalPinyinCache: TokenizationCache = {};
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Lazy-loaded modules
let pinyinPro: typeof import("pinyin-pro") | null = null;
let tokenizeChineseText:
  | typeof import("@/lib/chinese-tokenizer").tokenizeChineseText
  | null = null;

// OPTIMIZATION: Lazy load Chinese processing modules
const loadChineseModules = async () => {
  if (pinyinPro && tokenizeChineseText) return;

  try {
    // Load modules in parallel - only on client side
    if (typeof window === "undefined") return;

    const [pinyinModule, tokenizerModule] = await Promise.all([
      import("pinyin-pro"),
      import("@/lib/chinese-tokenizer"),
    ]);

    pinyinPro = pinyinModule;
    tokenizeChineseText = tokenizerModule.tokenizeChineseText;
  } catch (error) {
    console.error("Failed to load Chinese modules:", error);
  }
};

// OPTIMIZATION: Debounced tokenization to avoid excessive processing
const useDebounce = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

// OPTIMIZATION: Optimized Chinese word pinyin hook
export function useOptimizedChineseWordPinyin(
  word: string,
  enabled: boolean = true,
  options?: {
    toneType?: "none" | "num" | "symbol";
    pattern?: "pinyin" | "initial" | "final" | "num" | "first";
    removeNonZh?: boolean;
    v?: boolean;
  }
) {
  const [pinyin, setPinyin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // OPTIMIZATION: Debounce the word to avoid excessive processing
  const debouncedWord = useDebounce(word, 200);

  // OPTIMIZATION: Generate cache key
  const cacheKey = useCallback(() => {
    if (!debouncedWord || !enabled) return null;
    return `${debouncedWord}:${JSON.stringify(options)}`;
  }, [debouncedWord, enabled, options]);

  // OPTIMIZATION: Check cache first
  const getCachedPinyin = useCallback((key: string) => {
    const cached = globalPinyinCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.pinyin;
    }
    return null;
  }, []);

  // OPTIMIZATION: Set cache
  const setCachedPinyin = useCallback((key: string, pinyinValue: string) => {
    globalPinyinCache[key] = {
      pinyin: pinyinValue,
      timestamp: Date.now(),
    };

    // OPTIMIZATION: Clean up old cache entries
    const keys = Object.keys(globalPinyinCache);
    if (keys.length > 100) {
      const oldestKey = keys[0];
      delete globalPinyinCache[oldestKey];
    }
  }, []);

  useEffect(() => {
    if (!enabled || !debouncedWord || !isChineseText(debouncedWord)) {
      setPinyin("");
      setLoading(false);
      setError(null);
      return;
    }

    const key = cacheKey();
    if (!key) return;

    // Check cache first
    const cachedPinyin = getCachedPinyin(key);
    if (cachedPinyin) {
      setPinyin(cachedPinyin);
      setLoading(false);
      setError(null);
      return;
    }

    const generatePinyin = async () => {
      setLoading(true);
      setError(null);

      try {
        // Lazy load modules if not already loaded
        if (!isInitialized) {
          await loadChineseModules();
          setIsInitialized(true);
        }

        if (!pinyinPro || !tokenizeChineseText) {
          throw new Error("Chinese modules not available");
        }

        // Generate pinyin
        const pinyinResult = pinyinPro.pinyin(debouncedWord, {
          toneType: options?.toneType || "symbol",
          pattern: options?.pattern || "pinyin",
          removeNonZh: options?.removeNonZh || false,
          v: options?.v || false,
        });

        const result = pinyinResult.replace(/\s+/g, "");

        // Cache the result
        setCachedPinyin(key, result);
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

    generatePinyin();
  }, [
    debouncedWord,
    enabled,
    options,
    cacheKey,
    getCachedPinyin,
    setCachedPinyin,
    isInitialized,
  ]);

  return { pinyin, loading, error };
}

// OPTIMIZATION: Batch Chinese tokenization hook
export function useBatchChineseTokenization(
  words: string[],
  enabled: boolean = true,
  options?: {
    toneType?: "none" | "num" | "symbol";
    pattern?: "pinyin" | "initial" | "final" | "num" | "first";
    removeNonZh?: boolean;
    v?: boolean;
  }
) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // OPTIMIZATION: Debounce words array to avoid excessive processing
  const debouncedWords = useDebounce(words, 300);

  useEffect(() => {
    if (!enabled || debouncedWords.length === 0) {
      setResults({});
      setLoading(false);
      setError(null);
      return;
    }

    const processBatch = async () => {
      setLoading(true);
      setError(null);

      try {
        // Lazy load modules
        await loadChineseModules();

        if (!pinyinPro) {
          throw new Error("Chinese modules not available");
        }

        const newResults: Record<string, string> = {};
        const wordsToProcess: string[] = [];

        // Check cache first and collect words that need processing
        debouncedWords.forEach((word: string) => {
          const key = `${word}:${JSON.stringify(options)}`;
          const cached = getCachedPinyin(key);
          if (cached) {
            newResults[word] = cached;
          } else if (isChineseText(word)) {
            wordsToProcess.push(word);
          }
        });

        // Process words that aren't cached
        if (wordsToProcess.length > 0) {
          const pinyinPromises = wordsToProcess.map(async (word) => {
            try {
              if (!pinyinPro) throw new Error("pinyinPro not loaded");
              const pinyinResult = pinyinPro.pinyin(word, {
                toneType: options?.toneType || "symbol",
                pattern: options?.pattern || "pinyin",
                removeNonZh: options?.removeNonZh || false,
                v: options?.v || false,
              });

              const result = pinyinResult.replace(/\s+/g, "");

              // Cache the result
              const key = `${word}:${JSON.stringify(options)}`;
              setCachedPinyin(key, result);

              return { word, pinyin: result };
            } catch (err) {
              console.error(`Error processing word "${word}":`, err);
              return { word, pinyin: "" };
            }
          });

          const pinyinResults = await Promise.all(pinyinPromises);
          pinyinResults.forEach(({ word, pinyin }) => {
            newResults[word] = pinyin;
          });
        }

        setResults(newResults);
      } catch (err) {
        console.error("Error in batch tokenization:", err);
        setError(
          err instanceof Error ? err : new Error("Batch tokenization failed")
        );
      } finally {
        setLoading(false);
      }
    };

    processBatch();
  }, [debouncedWords, enabled, options]);

  return { results, loading, error };
}

// Helper functions
const getCachedPinyin = (key: string) => {
  const cached = globalPinyinCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.pinyin;
  }
  return null;
};

const setCachedPinyin = (key: string, pinyinValue: string) => {
  globalPinyinCache[key] = {
    pinyin: pinyinValue,
    timestamp: Date.now(),
  };

  // Clean up old cache entries
  const keys = Object.keys(globalPinyinCache);
  if (keys.length > 100) {
    const oldestKey = keys[0];
    delete globalPinyinCache[oldestKey];
  }
};

// OPTIMIZATION: Clear cache function for manual cache management
export const clearChineseTokenizationCache = () => {
  Object.keys(globalPinyinCache).forEach((key) => {
    delete globalPinyinCache[key];
  });
  console.log("Chinese tokenization cache cleared");
};
