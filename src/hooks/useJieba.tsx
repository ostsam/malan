"use client";

import { useState, useEffect, useCallback } from "react";

// Module state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Server-side safety check
const isServer = typeof window === "undefined";

/**
 * Initialize jieba-wasm (required before use)
 */
async function initializeJieba(): Promise<void> {
  // Don't initialize on server side
  if (isServer) {
    console.log("[useJieba] Skipping initialization on server side");
    return;
  }

  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log("[useJieba] Initializing jieba-wasm...");
      // Dynamic import to avoid server-side issues
      const jiebaModule = await import("jieba-wasm");
      await jiebaModule.default();
      isInitialized = true;
      console.log("[useJieba] jieba-wasm initialized successfully");
    } catch (error) {
      console.error("[useJieba] Failed to initialize jieba-wasm:", error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if text contains Chinese characters
 */
function isChineseText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u4e00-\u9fff]/.test(text);
}

// Simple cache for tokenization results
const tokenizationCache = new Map<string, string[]>();

/**
 * Hook for jieba-wasm Chinese text tokenization
 * Provides a clean interface for cutting Chinese text into words
 */
export function useJieba() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize jieba-wasm on mount
  useEffect(() => {
    // Don't initialize on server side
    if (isServer) {
      console.log("[useJieba] Skipping initialization on server side");
      return;
    }

    const init = async () => {
      try {
        await initializeJieba();
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error("[useJieba] Initialization error:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to initialize jieba")
        );
        setIsReady(false);
      }
    };

    init();
  }, []);

  /**
   * Cut Chinese text into words using jieba-wasm
   * @param text - The Chinese text to tokenize
   * @param useCache - Whether to use caching (default: true)
   * @returns Promise<string[]> - Array of segmented words
   */
  const cut = useCallback(
    async (text: string, useCache: boolean = true): Promise<string[]> => {
      if (!text || typeof text !== "string") {
        return [];
      }

      // Only process Chinese text
      if (!isChineseText(text)) {
        return [text]; // Return as single token for non-Chinese text
      }

      // Check cache first
      if (useCache && tokenizationCache.has(text)) {
        console.log("[useJieba] Using cached result for:", text);
        return tokenizationCache.get(text)!;
      }

      // Don't process on server side
      if (isServer) {
        console.log("[useJieba] Skipping tokenization on server side");
        return [text];
      }

      // Ensure jieba-wasm is ready
      if (!isReady) {
        console.log("[useJieba] Waiting for jieba-wasm to be ready...");
        await initializeJieba();
        setIsReady(true);
      }

      try {
        console.log("[useJieba] Cutting text:", text);
        // Dynamic import to avoid server-side issues
        const jiebaModule = await import("jieba-wasm");
        const tokens = jiebaModule.cut(text, true); // true for HMM mode
        console.log("[useJieba] Cut result:", tokens);

        // Cache the result
        if (useCache) {
          tokenizationCache.set(text, tokens);

          // Limit cache size
          if (tokenizationCache.size > 100) {
            const firstKey = tokenizationCache.keys().next().value;
            if (firstKey) {
              tokenizationCache.delete(firstKey);
            }
          }
        }

        return tokens;
      } catch (err) {
        console.error("[useJieba] Error cutting text:", err);
        // Fallback: return the entire text as a single token
        return [text];
      }
    },
    [isReady]
  );

  /**
   * Clear the tokenization cache
   */
  const clearCache = useCallback(() => {
    tokenizationCache.clear();
    console.log("[useJieba] Cache cleared");
  }, []);

  return {
    cut,
    isReady: isServer ? false : isReady, // Always false on server
    error,
    clearCache,
    isChineseText,
  };
}
