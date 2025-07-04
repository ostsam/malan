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
  ///
  async function toggle() {
    if (!lang) return;
    const res = await fetch("/api/wordlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, lang }),
    });
    const json = await res.json();
    mutate(json, { revalidate: false });
  }

  return { saved: data?.saved ?? false, toggle, mutate };
}
