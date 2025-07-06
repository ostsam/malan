import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDemoWordlistSummary() {
  const { data, mutate, isLoading } = useSWR<{
    summary: { lang: string; count: number }[];
  }>("/api/wordlist/demo", fetcher);
  return { summary: data?.summary ?? [], mutate, isLoading };
}

export function useDemoWordSaved(
  word: string,
  lang: string | undefined,
  onStatsUpdate?: (saved: boolean) => void
) {
  const key =
    word && lang
      ? `/api/wordlist/demo?word=${encodeURIComponent(word)}&lang=${lang}`
      : null;
  const { data, mutate } = useSWR<{ saved: boolean }>(key, fetcher, {
    revalidateOnFocus: false,
  });

  async function toggle() {
    if (!lang) return;
    const res = await fetch("/api/wordlist/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, lang }),
    });
    const json = await res.json();
    mutate(json, { revalidate: false });

    // Trigger stats update if callback provided
    if (onStatsUpdate) {
      onStatsUpdate(json.saved);
    }
  }

  return { saved: data?.saved ?? false, toggle, mutate };
}
