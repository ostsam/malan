import useSWR from "swr";
import React, { useCallback, useMemo } from "react";

interface WordlistItem {
  createdAt: string;
  word: string;
  pos: string;
  sense: string;
  translatedSense: string | null;
  examples: string[];
  transLang: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// OPTIMIZATION: Enhanced wordlist hook with pagination and batch operations
export function useWordlistSummary() {
  const { data, mutate, isLoading } = useSWR<{
    summary: { lang: string; count: number; lastAdded: string }[];
  }>("/api/wordlist", fetcher);
  return { summary: data?.summary ?? [], mutate, isLoading };
}

// OPTIMIZATION: Batch word status hook
export function useBatchWordStatus() {
  const { data, mutate } = useSWR<{ savedStatuses: Record<string, boolean> }>(
    null, // Will be set dynamically
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

  const checkBatchStatus = useCallback(
    async (words: Array<{ word: string; lang: string }>) => {
      if (words.length === 0) return {};

      const url = new URL("/api/wordlist", window.location.origin);
      url.searchParams.set("batch", "true");
      url.searchParams.set("word", JSON.stringify({ words }));

      const response = await fetch(url.toString());
      const result = await response.json();

      return result.savedStatuses || {};
    },
    []
  );

  return { savedStatuses: data?.savedStatuses ?? {}, checkBatchStatus, mutate };
}

// OPTIMIZATION: Paginated wordlist hook
export function usePaginatedWordlist(
  lang: string,
  nativeLang: string,
  limit: number = 50
) {
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState<"forward" | "backward">(
    "forward"
  );

  const url = useMemo(() => {
    // Use relative URL to avoid window dependency during SSR
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3002";
    const url = new URL("/api/wordlist", baseUrl);
    url.searchParams.set("lang", lang);
    url.searchParams.set("nativeLang", nativeLang);
    url.searchParams.set("limit", limit.toString());
    if (cursor) {
      url.searchParams.set("cursor", cursor);
      url.searchParams.set("direction", direction);
    }
    return url.toString();
  }, [lang, nativeLang, limit, cursor, direction]);

  const { data, mutate, isLoading, error } = useSWR<{
    items: WordlistItem[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
      prevCursor: string | null;
    };
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });

  const loadNext = useCallback(() => {
    if (data?.pagination.hasMore && data.pagination.nextCursor) {
      setCursor(data.pagination.nextCursor);
      setDirection("forward");
    }
  }, [data?.pagination]);

  const loadPrevious = useCallback(() => {
    if (data?.pagination.prevCursor) {
      setCursor(data.pagination.prevCursor);
      setDirection("backward");
    }
  }, [data?.pagination]);

  const reset = useCallback(() => {
    setCursor(null);
    setDirection("forward");
  }, []);

  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? {
      hasMore: false,
      nextCursor: null,
      prevCursor: null,
    },
    isLoading,
    error,
    loadNext,
    loadPrevious,
    reset,
    mutate,
  };
}

// OPTIMIZATION: Enhanced individual word status hook with caching
export function useWordSaved(word: string, lang: string | undefined) {
  const key =
    word && lang
      ? `/api/wordlist?word=${encodeURIComponent(word)}&lang=${lang}`
      : null;
  const { data, mutate } = useSWR<{ saved: boolean }>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });

  async function toggle() {
    if (!lang) return;

    // Optimistic update - immediately change the UI
    const currentSaved = data?.saved ?? false;
    const optimisticData = { saved: !currentSaved };

    // Update the cache optimistically
    mutate(optimisticData, { revalidate: false });

    try {
      const res = await fetch("/api/wordlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, lang }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle word");
      }

      const json = await res.json();
      // Update with the actual server response
      mutate(json, { revalidate: false });
    } catch (error) {
      console.error("Failed to toggle word:", error);
      // Revert the optimistic update on error
      mutate({ saved: currentSaved }, { revalidate: false });
    }
  }

  return { saved: data?.saved ?? false, toggle, mutate };
}

// OPTIMIZATION: Debounced search hook
export function useDebouncedSearch(
  initialQuery: string = "",
  delay: number = 300
) {
  const [query, setQuery] = React.useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialQuery);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return { query, setQuery, debouncedQuery };
}

// OPTIMIZATION: Memoized word processing hook
export function useProcessedWordlist(
  items: WordlistItem[],
  ascending: boolean,
  query: string
) {
  return useMemo(() => {
    // Group definitions per word
    const map = new Map<
      string,
      { defs: WordlistItem[]; createdAt: string; transLang: string | null }
    >();

    for (const it of items) {
      if (!map.has(it.word)) {
        map.set(it.word, {
          defs: [],
          createdAt: it.createdAt || "",
          transLang: it.transLang ?? null,
        });
      }
      const obj = map.get(it.word)!;
      const list = obj.defs;
      const existing = list.find(
        (d) => d.pos === it.pos && d.sense === it.sense
      );
      if (existing) {
        if (!existing.translatedSense && it.translatedSense) {
          existing.translatedSense = it.translatedSense;
        }
      } else {
        list.push({
          pos: it.pos,
          sense: it.sense,
          translatedSense: it.translatedSense,
          examples: it.examples,
          createdAt: it.createdAt || "",
          word: it.word,
          transLang: it.transLang ?? null,
        });
      }
    }

    let processedItems = Array.from(map.entries()).map(([word, obj]) => ({
      word,
      defs: obj.defs,
      createdAt: obj.createdAt,
      transLang: obj.defs.some((d) => d.translatedSense) ? obj.transLang : null,
    }));

    // Sorting
    processedItems = [...processedItems].sort((a, b) => {
      const aDate = a.createdAt || "";
      const bDate = b.createdAt || "";
      return ascending
        ? aDate.localeCompare(bDate)
        : bDate.localeCompare(aDate);
    });

    // Filtering
    const q = query.trim().toLowerCase();
    const filteredItems = q
      ? processedItems.filter(
          (entry) =>
            entry.word.toLowerCase().includes(q) ||
            entry.defs.some((d) => d.sense.toLowerCase().includes(q))
        )
      : processedItems;

    return { items: processedItems, filteredItems };
  }, [items, ascending, query]);
}
