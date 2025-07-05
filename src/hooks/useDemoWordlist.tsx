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
    // For demo, just show a message that they need to sign up
    alert("Sign up to save words to your wordlist!");
    mutate({ saved: false }, { revalidate: false });
  }

  return { saved: data?.saved ?? false, toggle, mutate };
}
