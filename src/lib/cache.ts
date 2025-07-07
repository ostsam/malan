// Simple in-memory cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum number of entries
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  set<T>(key: string, data: T, ttl: number = 3600000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  WORD_DEFINITION: (word: string, lang: string, target?: string) =>
    `word:${word}:${lang}${target ? `:${target}` : ""}`,
  WORD_STATUS: (word: string, lang: string, userId: string) =>
    `status:${word}:${lang}:${userId}`,
  USER_STATS: (userId: string) => `stats:${userId}`,
  WORDLIST_SUMMARY: (userId: string) => `summary:${userId}`,
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  WORD_DEFINITION: 3600000, // 1 hour
  WORD_STATUS: 300000, // 5 minutes
  USER_STATS: 60000, // 1 minute
  WORDLIST_SUMMARY: 300000, // 5 minutes
} as const;

// Helper functions
export function getCachedWordDefinition<T>(
  word: string,
  lang: string,
  target?: string
): T | null {
  const key = CACHE_KEYS.WORD_DEFINITION(word, lang, target);
  const result = cache.get<T>(key);

  // Track cache access
  if (typeof window !== "undefined") {
    import("./performance").then(({ trackCacheAccess }) => {
      trackCacheAccess("word_definition", !!result);
    });
  }

  return result;
}

export function setCachedWordDefinition<T>(
  word: string,
  lang: string,
  data: T,
  target?: string
): void {
  const key = CACHE_KEYS.WORD_DEFINITION(word, lang, target);
  cache.set(key, data, CACHE_TTL.WORD_DEFINITION);
}

export function invalidateWordDefinition(
  word: string,
  lang: string,
  target?: string
): void {
  const key = CACHE_KEYS.WORD_DEFINITION(word, lang, target);
  cache.delete(key);
}

export function getCachedUserStats<T>(userId: string): T | null {
  const key = CACHE_KEYS.USER_STATS(userId);
  return cache.get<T>(key);
}

export function setCachedUserStats<T>(userId: string, data: T): void {
  const key = CACHE_KEYS.USER_STATS(userId);
  cache.set(key, data, CACHE_TTL.USER_STATS);
}

export function invalidateUserStats(userId: string): void {
  const key = CACHE_KEYS.USER_STATS(userId);
  cache.delete(key);
}
