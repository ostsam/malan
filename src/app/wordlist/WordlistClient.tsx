"use client";

import React, { useState, useCallback } from "react";
import useSWR from "swr";
import { Star, StarOff, BookOpen, Volume2, ArrowUpDown } from "lucide-react";
import { useWordSaved } from "@/hooks/useWordlist";
import { interfaceColor } from "@/lib/theme";
import { cn } from "@/lib/utils";
import Switch from "react-switch";

interface RawItem {
  createdAt: string;
  word: string;
  pos: string;
  sense: string;
  translatedSense: string | null;
  examples: string[];
  transLang: string | null;
}

interface Definition {
  pos: string;
  sense: string;
  translatedSense: string | null;
  examples: string[];
}

interface WordEntry {
  word: string;
  defs: Definition[];
  createdAt: string;
  transLang: string | null;
}

interface SummaryItem {
  lang: string;
  count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Map full part-of-speech labels to abbreviations
const posAbbrev: Record<string, string> = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  pronoun: "pron.",
  determiner: "det.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
  numeral: "num.",
  particle: "part.",
  article: "art.",
};

function abbreviatePOS(pos: string) {
  const key = pos.toLowerCase();
  return posAbbrev[key] || pos;
}

export default function WordlistClient({
  initialLang,
  initialItems,
  summary,
  nativeLang,
}: {
  initialLang: string;
  initialItems: RawItem[];
  summary: SummaryItem[];
  nativeLang: string;
}) {
  const [lang, setLang] = useState(initialLang);
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");

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
  const map = new Map<
    string,
    { defs: Definition[]; createdAt: string; transLang: string | null }
  >();
  for (const it of rawItems) {
    if (!map.has(it.word)) {
      map.set(it.word, {
        defs: [],
        createdAt: it.createdAt || "",
        transLang: it.transLang ?? null,
      });
    }
    const obj = map.get(it.word)!;
    const list = obj.defs;
    const existing = list.find((d) => d.pos === it.pos && d.sense === it.sense);
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
      });
    }
  }
  let items: WordEntry[] = Array.from(map.entries()).map(([word, obj]) => ({
    word,
    defs: obj.defs,
    createdAt: obj.createdAt,
    transLang: obj.defs.find((d) => d.translatedSense)?.translatedSense
      ? (obj.transLang ?? null)
      : null,
  }));

  // Sorting (make copy to avoid in-place mutations affecting subsequent toggles)
  items = [...items].sort((a, b) => {
    const aDate = a.createdAt || "";
    const bDate = b.createdAt || "";
    return ascending ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
  });

  // Filtering
  const q = query.trim().toLowerCase();
  const filteredItems = q
    ? items.filter(
        (entry) =>
          entry.word.toLowerCase().includes(q) ||
          entry.defs.some((d) => d.sense.toLowerCase().includes(q))
      )
    : items;

  // Enable page scrolling (override global overflow-hidden)
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflowY = "auto";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BookOpen className="h-6 w-6" style={{ color: interfaceColor }} />
        Wordlist
      </h1>

      {/* Search & controls */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Language tabs */}
        <div className="flex flex-wrap gap-2">
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

        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800"
        />

        {/* Order toggle button */}
        <button
          className="flex items-center gap-1 text-sm border px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => setAscending((v) => !v)}
        >
          <ArrowUpDown size={14} />
          {ascending ? "Newest" : "Oldest"}
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <p>No matching words.</p>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((entry) => (
            <WordItem
              key={entry.word}
              entry={entry}
              lang={lang}
              onToggle={mutate}
              nativeLang={nativeLang}
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
  nativeLang,
}: {
  entry: WordEntry;
  lang: string;
  onToggle: () => void;
  nativeLang: string;
}) {
  const { saved, toggle } = useWordSaved(entry.word, lang);
  const [open, setOpen] = useState(false);
  const [useTarget, setUseTarget] = useState(false);
  const [defs, setDefs] = useState(entry.defs);

  const ensureTranslations = useCallback(async () => {
    if (defs.every((d) => d.translatedSense)) return;
    try {
      const url = new URL(`/api/dict`, window.location.origin);
      url.searchParams.set("lang", lang);
      url.searchParams.set("word", entry.word);
      url.searchParams.set("target", nativeLang);
      const resp = await fetch(url.toString());
      const data = await resp.json(); // { defs: [...] }
      if (Array.isArray(data?.defs)) {
        setDefs((prev) => {
          const map = new Map(prev.map((d) => [d.pos + d.sense, d]));
          for (const nd of data.defs) {
            const key = nd.pos + nd.sense;
            const existing = map.get(key);
            if (existing) {
              existing.translatedSense = nd.sense; // API returns translated text in sense
            }
          }
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.error("Failed fetching translations", e);
    }
  }, [lang, nativeLang, entry.word, defs]);

  const handleToggle = async () => {
    await toggle();
    onToggle();
  };

  return (
    <li className="border rounded-xl shadow-sm bg-white/80 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-full p-2 flex justify-between items-start gap-3 text-left focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="min-w-0">
          <p className="font-semibold truncate mb-1 flex items-center gap-1">
            {entry.word}
            <button
              aria-label="Play pronunciation"
              onClick={async (e) => {
                e.stopPropagation(); // prevent expanding/collapsing
                try {
                  const res = await fetch("/api/chat/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: entry.word, voice: "nova" }),
                  });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  audio.play();
                  audio.addEventListener("ended", () =>
                    URL.revokeObjectURL(url)
                  );
                } catch (err) {
                  console.error("Failed to play TTS", err);
                }
              }}
              className="text-[#3C18D9] dark:text-white/80 hover:opacity-80"
            >
              <Volume2 size={14} />
            </button>
          </p>
          {/* per-word toggle */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] uppercase opacity-70">{lang}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Switch
                onChange={async () => {
                  if (!useTarget) await ensureTranslations();
                  setUseTarget((v) => !v);
                }}
                checked={useTarget}
                uncheckedIcon={false}
                checkedIcon={false}
                onColor={interfaceColor}
                offColor={interfaceColor}
                height={12}
                width={24}
                handleDiameter={10}
              />
            </div>
            <span className="text-[10px] uppercase opacity-70">
              {entry.transLang ?? nativeLang}
            </span>
          </div>

          <p className="text-xs opacity-60 mb-4">
            Added {new Date(entry.createdAt).toLocaleDateString()}
          </p>

          <div className="space-y-3">
            {defs.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm break-words",
                  i > 0 &&
                    "pt-2 border-t border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-center w-10 bg-[#3C18D9]/10 text-[#3C18D9] text-[8px] font-semibold py-1 px-1 rounded uppercase">
                    {abbreviatePOS(d.pos)}
                  </span>
                  <span className="flex-1 break-words">
                    {useTarget && d.translatedSense
                      ? d.translatedSense
                      : d.sense}
                  </span>
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
      </div>
    </li>
  );
}
