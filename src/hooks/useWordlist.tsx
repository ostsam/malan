import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWordlistSummary() {
  const { data, mutate, isLoading } = useSWR<{
    summary: { lang: string; count: number }[];
  }>("/api/wordlist", fetcher);
  return { summary: data?.summary ?? [], mutate, isLoading };
}

export function useWordSaved(word: string, lang: string | undefined) {
  const key =
    word && lang
      ? `/api/wordlist?word=${encodeURIComponent(word)}&lang=${lang}`
      : null;
  const { data, mutate } = useSWR<{ saved: boolean }>(key, fetcher, {
    revalidateOnFocus: false,
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
