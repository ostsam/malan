"use client";

import { useState } from "react";
import useSWR from "swr";
import { Star, StarOff, BookOpen } from "lucide-react";
import { useWordSaved } from "@/hooks/useWordlist";
import { interfaceColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Item {
  word: string;
  pos: string;
  sense: string;
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
  initialItems: Item[];
  summary: SummaryItem[];
}) {
  const [lang, setLang] = useState(initialLang);

  const { data: itemsData, mutate } = useSWR<{ items: Item[] }>(
    `/api/wordlist?lang=${lang}`,
    fetcher,
    {
      fallbackData: { items: initialItems },
      revalidateOnFocus: false,
    }
  );

  const items = itemsData?.items ?? [];

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
          {items.map((it) => (
            <WordItem
              key={`${it.word}-${it.pos}`}
              item={it}
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
  item,
  lang,
  onToggle,
}: {
  item: Item;
  lang: string;
  onToggle: () => void;
}) {
  const { saved, toggle } = useWordSaved(item.word, lang);

  const handleToggle = async () => {
    await toggle();
    onToggle();
  };

  return (
    <li className="border p-2 rounded flex justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold truncate">
          {item.word} <span className="text-xs opacity-70">({item.pos})</span>
        </p>
        <p className="text-sm opacity-80 break-words">{item.sense}</p>
      </div>
      <button
        onClick={handleToggle}
        className="text-yellow-400 flex-shrink-0"
        aria-label={saved ? "Remove from wordlist" : "Add to wordlist"}
      >
        {saved ? <Star fill="currentColor" size={20} /> : <StarOff size={20} />}
      </button>
    </li>
  );
}
