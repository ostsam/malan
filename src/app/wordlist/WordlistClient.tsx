"use client";

import React, { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { Star, StarOff, BookOpen, Volume2, ArrowUpDown } from "lucide-react";
import { useWordSaved } from "@/hooks/useWordlist";
import { interfaceColor } from "@/lib/theme";
import { cn } from "@/lib/utils";
import Switch from "react-switch";
import { useChineseWordPinyin } from "@/hooks/useChineseTokenizedText";

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

// OPTIMIZATION: Improve fetcher with better error handling and caching
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "Cache-Control": "max-age=300",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

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
  return posAbbrev[key] || pos.slice(0, 3).toUpperCase();
}

// Helper function to parse translatedSense format: "word (definition)"
function parseTranslation(text: string): { word: string; definition: string } | null {
  const match = text.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return {
      word: match[1].trim(),
      definition: match[2].trim()
    };
  }
  return null;
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

  // OPTIMIZATION: Better SWR configuration for performance
  const { data: itemsData, mutate } = useSWR<{ items: RawItem[] }>(
    `/api/wordlist?lang=${lang}&nativeLang=${nativeLang}`,
    fetcher,
    {
      fallbackData: { items: initialItems },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  const processedItems = useMemo(() => {
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
      return ascending
        ? aDate.localeCompare(bDate)
        : bDate.localeCompare(aDate);
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

    return { filteredItems };
  }, [itemsData?.items, ascending, query]);

  // OPTIMIZATION: Memoize language tabs to prevent unnecessary re-renders
  const languageTabs = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {summary.map((s) => {
          const active = s.lang === lang;
          return (
            <button
              key={s.lang}
              className={cn(
                "glassmorphic text-slate-400 px-3 py-1 rounded-full text-sm border transition-colors backdrop-blur-sm",
                active
                  ? "bg-[#3C18D9] text-slate-800 border-transparent shadow-lg"
                  : "bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-700"
              )}
              onClick={() => setLang(s.lang)}
            >
              {s.lang.toUpperCase()}{" "}
              <span className="opacity-70">({s.count})</span>
            </button>
          );
        })}
      </div>
    ),
    [summary, lang]
  );

  // Enable page scrolling (override global overflow-hidden)
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflowY = "auto";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="glassmorphic max-w-lg mx-auto p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
      <h1
        className="text-2xl font-bold mb-4 flex items-center justify-center gap-2"
        style={{ color: interfaceColor }}
      >
        <BookOpen className="h-6 w-6" style={{ color: interfaceColor }} />
        Wordlist
      </h1>

      {/* Search & controls */}
      <div className="glassmorphic flex flex-wrap gap-2 mb-4 items-center p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
        {/* Language tabs */}
        {languageTabs}

        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="glassmorphic flex-1 border rounded px-2 py-1 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-600/60"
        />

        {/* Order toggle button */}
        <button
          className="glassmorphic flex items-center gap-1 text-sm border px-2 py-1 rounded hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-600/60 transition-all duration-300"
          onClick={() => setAscending((v) => !v)}
        >
          <ArrowUpDown size={14} />
          {ascending ? "Newest" : "Oldest"}
        </button>
      </div>

      {processedItems.filteredItems.length === 0 ? (
        <p>No matching words.</p>
      ) : (
        <ul className="space-y-3">
          {processedItems.filteredItems.map((entry) => (
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
  const [defs] = useState(entry.defs); // OPTIMIZATION: Don't recreate defs on every render

  // No need for ensureTranslations - translations are already fetched from the API
  const hasTranslations = defs.some((d) => d.translatedSense);

  const handleToggle = useCallback(async () => {
    await toggle();
    onToggle();
  }, [toggle, onToggle]);

  // Add pinyin for the word
  const { pinyin } = useChineseWordPinyin(entry.word, lang === "zh", {
    toneType: "symbol",
    case: "lowercase",
  });

  return (
    <li className="glassmorphic border rounded-xl shadow-lg bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 transition-colors backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
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
          <p className="font-semibold text-xl truncate mb-1 flex items-center gap-1">
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
                  
                  // Parse the JSON response with base64encoded chunks
                  const data = await res.json();
                  if (!data.chunks || !Array.isArray(data.chunks) || data.chunks.length === 0) {
                    console.error("Invalid TTS response format or empty chunks");
                    return;
                  }
                  
                  // Convert the first chunk to blob (for single word, we only need one chunk)
                  const base64Chunk = data.chunks[0];
                  const binaryString = atob(base64Chunk);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  const blob = new Blob([bytes], { type: "audio/opus" });
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
          {/* Pinyin display under the word */}
          {pinyin && <p className="text-base opacity-80 mb-1">{pinyin}</p>}
          {/* per-word toggle */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] uppercase opacity-70">{lang}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="relative"
            >
              <Switch
                onChange={() => {
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
                disabled={!hasTranslations}
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
                  <span className="glassmorphic text-center w-11 bg-[#3C18D9]/20 text-[#3C18D9] text-[8px] font-semibold py-1 px-1 rounded uppercase backdrop-blur-sm border border-[#3C18D9]/30">
                    {abbreviatePOS(d.pos)}
                  </span>
                  <span className="flex-1 break-words">
                    {(() => {
                      const displayText = useTarget && d.translatedSense
                        ? d.translatedSense
                        : d.sense;
                      const parsedTranslation = parseTranslation(displayText);
                      
                      if (parsedTranslation) {
                        return parsedTranslation.word;
                      } else {
                        return displayText;
                      }
                    })()}
                  </span>
                </div>
                {(() => {
                  const displayText = useTarget && d.translatedSense
                    ? d.translatedSense
                    : d.sense;
                  const parsedTranslation = parseTranslation(displayText);
                  
                  if (parsedTranslation) {
                    return (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-13">
                        ({parsedTranslation.definition})
                      </div>
                    );
                  }
                  return null;
                })()}
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
          className="text-yellow-400 flex-shrink-0 mt-1 cursor-pointer"
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
