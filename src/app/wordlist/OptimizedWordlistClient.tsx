"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useRef } from "react";
import {
  Star,
  StarOff,
  BookOpen,
  Volume2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useWordSaved,
  useDebouncedSearch,
  useProcessedWordlist,
  useBatchWordStatus,
  usePaginatedWordlist,
} from "@/hooks/useWordlist";
import { useOptimizedChineseWordPinyin } from "@/hooks/useOptimizedChineseTokenization";
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
  lastAdded: string;
}

// OPTIMIZATION: Memoized component for better performance
const OptimizedWordItem = React.memo(function OptimizedWordItem({
  entry,
  lang,
  onToggle,
  nativeLang,
  savedStatus,
}: {
  entry: WordEntry;
  lang: string;
  onToggle: () => void;
  nativeLang: string;
  savedStatus: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [useTarget, setUseTarget] = useState(false);
  const [defs] = useState(entry.defs); // OPTIMIZATION: Don't recreate defs on every render

  // OPTIMIZATION: Use optimized Chinese pinyin hook
  const { pinyin } = useOptimizedChineseWordPinyin(entry.word, lang === "zh", {
    toneType: "symbol",
    case: "lowercase",
  });

  const hasTranslations = defs.some((d) => d.translatedSense);

  const handleToggle = useCallback(async () => {
    await onToggle();
  }, [onToggle]);

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
                e.stopPropagation();
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

          {/* OPTIMIZATION: Show pinyin immediately if available */}
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
          className="text-yellow-400 flex-shrink-0 mt-1 cursor-pointer"
          aria-label={savedStatus ? "Remove from wordlist" : "Add to wordlist"}
        >
          {savedStatus ? (
            <Star fill="currentColor" size={20} />
          ) : (
            <StarOff size={20} />
          )}
        </button>
      </div>
    </li>
  );
});

// OPTIMIZATION: Map full part-of-speech labels to abbreviations
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

// OPTIMIZATION: Main optimized wordlist client
export default function OptimizedWordlistClient({
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

  // OPTIMIZATION: Use debounced search
  const { query, setQuery, debouncedQuery } = useDebouncedSearch("", 300);

  // OPTIMIZATION: Use paginated wordlist hook
  const {
    items: rawItems,
    pagination,
    isLoading,
    error,
    loadNext,
    loadPrevious,
    reset,
    mutate,
  } = usePaginatedWordlist(lang, nativeLang, 50);

  // OPTIMIZATION: Use processed wordlist hook
  const { items, filteredItems } = useProcessedWordlist(
    rawItems.length > 0 ? rawItems : initialItems,
    ascending,
    debouncedQuery
  );

  // OPTIMIZATION: Batch word status check
  const { savedStatuses, checkBatchStatus } = useBatchWordStatus();
  const [batchChecked, setBatchChecked] = useState(false);

  // OPTIMIZATION: Check batch status when items change
  React.useEffect(() => {
    if (filteredItems.length > 0 && !batchChecked) {
      const wordsToCheck = filteredItems.map((entry) => ({
        word: entry.word,
        lang: lang,
      }));

      checkBatchStatus(wordsToCheck);
      setBatchChecked(true);
    }
  }, [filteredItems, lang, checkBatchStatus, batchChecked]);

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
              onClick={() => {
                setLang(s.lang);
                reset(); // Reset pagination when changing language
                setBatchChecked(false); // Reset batch check
              }}
            >
              {s.lang.toUpperCase()}{" "}
              <span className="opacity-70">({s.count})</span>
            </button>
          );
        })}
      </div>
    ),
    [summary, lang, reset]
  );

  // OPTIMIZATION: Memoize pagination controls
  const paginationControls = useMemo(
    () => (
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={loadPrevious}
          disabled={!pagination.prevCursor || isLoading}
          className={cn(
            "flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors",
            pagination.prevCursor && !isLoading
              ? "bg-[#3C18D9] text-white hover:bg-[#3C18D9]/80"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="text-sm text-gray-600">
          {filteredItems.length} words
        </span>

        <button
          onClick={loadNext}
          disabled={!pagination.hasMore || isLoading}
          className={cn(
            "flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors",
            pagination.hasMore && !isLoading
              ? "bg-[#3C18D9] text-white hover:bg-[#3C18D9]/80"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    ),
    [pagination, isLoading, filteredItems.length, loadNext, loadPrevious]
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
      <div className="glassmorphic flex flex-wrap gap-2 mb-8 items-center p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
        {/* Language tabs */}
        {languageTabs}

        {/* OPTIMIZATION: Debounced search input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="glassmorphic flex-1 border rounded px-2 py-1 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-600/60"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3C18D9] mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading words...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">
            Failed to load wordlist. Please try again.
          </p>
          <button
            onClick={reset}
            className="mt-2 px-4 py-2 bg-[#3C18D9] text-white rounded hover:bg-[#3C18D9]/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Wordlist content */}
      {!isLoading && !error && (
        <>
          {filteredItems.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No matching words.</p>
          ) : (
            <>
              {/* Sort button in upper right */}
              <div className="flex justify-end mb-1">
                <button
                  className="glassmorphic flex items-center gap-1 text-xs border px-2 py-1 rounded hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-600/60 transition-all duration-300"
                  onClick={() => setAscending((v) => !v)}
                >
                  <ArrowUpDown size={12} />
                  {ascending ? "Newest" : "Oldest"}
                </button>
              </div>

              <ul className="space-y-3">
                {filteredItems.map((entry) => (
                  <OptimizedWordItem
                    key={entry.word}
                    entry={entry}
                    lang={lang}
                    onToggle={mutate}
                    nativeLang={nativeLang}
                    savedStatus={
                      savedStatuses[`${entry.word}:${lang}`] ?? false
                    }
                  />
                ))}
              </ul>

              {/* OPTIMIZATION: Pagination controls */}
              {paginationControls}
            </>
          )}
        </>
      )}
    </div>
  );
}
