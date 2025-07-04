"use client";

import { useState } from "react";
import useSWR from "swr";
import { Star, StarOff, BookOpen } from "lucide-react";
import { useWordSaved } from "@/hooks/useWordlist";
import { interfaceColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface RawItem {
  word: string;
  pos: string;
  sense: string;
  examples: string[];
}

interface Definition {
  pos: string;
  sense: string;
  examples: string[];
}

interface WordEntry {
  word: string;
  defs: Definition[];
}

interface SummaryItem {
  lang: string;
  count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WordlistClient({
  initialLang,
  initialItems,
  summary,
}: {
  initialLang: string;
  initialItems: RawItem[];
  summary: SummaryItem[];
}) {
  const [lang, setLang] = useState(initialLang);

  const { data: itemsData, mutate } = useSWR<{ items: RawItem[] }>(
    `/api/wordlist?lang=${lang}`,
    fetcher,
    {
      fallbackData: { items: initialItems },
      revalidateOnFocus: false,
    }
  );

  const rawItems = itemsData?.items ?? [];

  // Group definitions per word
  const map = new Map<string, Definition[]>();
  for (const it of rawItems) {
    if (!map.has(it.word)) map.set(it.word, []);
    const list = map.get(it.word)!;
    // deduplicate by pos + sense
    if (!list.some((d) => d.pos === it.pos && d.sense === it.sense)) {
      list.push({ pos: it.pos, sense: it.sense, examples: it.examples });
    }
  }
  const items: WordEntry[] = Array.from(map.entries()).map(([word, defs]) => ({
    word,
    defs,
  }));

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BookOpen className="h-6 w-6" style={{ color: interfaceColor }} />
        Wordlist
      </h1>

      {/* Language tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {summary.map((s) => {
          const active = s.lang === lang;
          return (
            <button
              key={s.lang}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                active
                  ? "bg-[#3C18D9] text-white border-transparent"
                  : "bg-white dark:bg-slate-800 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
              onClick={() => setLang(s.lang)}
            >
              {s.lang.toUpperCase()}{" "}
              <span className="opacity-70">({s.count})</span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p>No words saved yet for {lang.toUpperCase()}.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => (
            <WordItem
              key={entry.word}
              entry={entry}
              lang={lang}
              onToggle={mutate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WordItem({
  entry,
  lang,
  onToggle,
}: {
  entry: WordEntry;
  lang: string;
  onToggle: () => void;
}) {
  const { saved, toggle } = useWordSaved(entry.word, lang);
  const [open, setOpen] = useState(false);

  const handleToggle = async () => {
    await toggle();
    onToggle();
  };

  return (
    <li className="border rounded-xl shadow-sm bg-white/80 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-2 flex justify-between items-start gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold truncate mb-2">{entry.word}</p>
          <div className="space-y-3">
            {entry.defs.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm break-words",
                  i > 0 &&
                    "pt-2 border-t border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="inline-block bg-[#3C18D9]/10 text-[#3C18D9] text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
                    {d.pos}
                  </span>
                  <span>{d.sense}</span>
                </div>
                {open && d.examples.length > 0 && (
                  <div className="mt-1 ml-6 space-y-1">
                    {d.examples.map((ex, idx) => (
                      <p key={idx} className="italic opacity-80 break-words">
                        {ex}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="text-yellow-400 flex-shrink-0 mt-1"
          aria-label={saved ? "Remove from wordlist" : "Add to wordlist"}
        >
          {saved ? (
            <Star fill="currentColor" size={20} />
          ) : (
            <StarOff size={20} />
          )}
        </button>
      </button>
    </li>
  );
}
