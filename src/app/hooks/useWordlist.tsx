import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// OPTIMIZATION: Better caching configuration for wordlist data
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
  errorRetryCount: 2,
  errorRetryInterval: 5000,
};

export function useWordlistSummary() {
  return useSWR("/api/wordlist/summary", fetcher, swrConfig);
}

export function useWordSaved(word: string, lang: string | undefined) {
  const { data, mutate } = useSWR(
    lang ? `/api/wordlist/saved?word=${word}&lang=${lang}` : null,
    fetcher,
    swrConfig
  );

  async function toggle() {
    if (!lang) return;

    // OPTIMIZATION: Optimistic update for better UX
    const optimisticData = !data?.saved;
    mutate({ saved: optimisticData }, false);

    try {
      const res = await fetch("/api/wordlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, lang }),
      });

      if (!res.ok) {
        // Revert on error
        mutate({ saved: !optimisticData }, false);
        throw new Error("Failed to toggle word");
      }

      // Revalidate with actual data
      mutate();
    } catch (error) {
      console.error("Failed to toggle word:", error);
      // Revert on error
      mutate({ saved: !optimisticData }, false);
    }
  }

  return { saved: data?.saved || false, toggle };
}
