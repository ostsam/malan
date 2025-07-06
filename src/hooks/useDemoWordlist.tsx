import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDemoWordlistSummary() {
  const { data, mutate, isLoading } = useSWR<{
    summary: { lang: string; count: number }[];
  }>("/api/wordlist/demo", fetcher);
  return { summary: data?.summary ?? [], mutate, isLoading };
}

export function useDemoWordSaved(word: string, lang: string | undefined) {
  const key =
    word && lang
      ? `/api/wordlist/demo?word=${encodeURIComponent(word)}&lang=${lang}`
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
      // For demo, just show a message that they need to sign up
      alert("Sign up to save words to your wordlist!");
      // Keep the optimistic state for demo purposes
      mutate(optimisticData, { revalidate: false });
    } catch (error) {
      console.error("Demo toggle error:", error);
      // Revert the optimistic update on error
      mutate({ saved: currentSaved }, { revalidate: false });
    }
  }

  return { saved: data?.saved ?? false, toggle, mutate };
}
