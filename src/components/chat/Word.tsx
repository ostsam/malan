"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Definition } from "@/server/dictionary/types";
import { interfaceColor } from "@/lib/theme";
import Switch from "react-switch";
import { Star, StarOff, Volume2 } from "lucide-react";
import { useWordSaved } from "@/hooks/useWordlist";
import { useCachedUserStats } from "@/app/hooks/useCachedUserStats";

interface WordProps extends React.HTMLAttributes<HTMLSpanElement> {
  initialWord: string;
  lang: string; // language of word (selectedLanguage)
  targetLang?: string | null; // user's native language
  /** Prefetched or highlighted word */
  highlight?: boolean;
  isUser?: boolean;
  // inside WordProps add provider toggling state
}

interface DictResponse {
  word: string;
  defs: Definition[];
  source: string;
}

// Module-level cache shared across component instances
const dictCache = new Map<string, Promise<DictResponse>>();

export function Word({
  initialWord,
  lang,
  targetLang,
  highlight,
  isUser = false,
  className,
  ...props
}: WordProps) {
  const [useTarget, setUseTarget] = useState(false);
  const [useGPT, setUseGPT] = useState(false);
  const [hasWiki, setHasWiki] = useState<boolean>(false);
  const [source, setSource] = useState<string | null>(null);

  /* ------------------------------- State ------------------------------ */
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictResponse | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [wordStack, setWordStack] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>(initialWord);

  // Get cached stats for optimistic updates
  const { incrementWordCount, decrementWordCount } = useCachedUserStats();

  const { saved, toggle } = useWordSaved(currentWord, lang, (saved) => {
    // Optimistically update stats when word is saved/unsaved
    if (saved) {
      incrementWordCount();
    } else {
      decrementWordCount();
    }
  });

  const computeKey = () =>
    `${lang}:${useTarget && targetLang ? targetLang : lang}:${currentWord.toLowerCase()}:$${useGPT ? "gpt" : "wiki"}`;

  /* ----------------------------- Fetching ----------------------------- */
  const fetchDefinition = useCallback(async () => {
    let promise = dictCache.get(computeKey());
    if (!promise) {
      const url = new URL(`/api/dict`, window.location.origin);
      url.searchParams.set("lang", lang);
      url.searchParams.set("word", currentWord);
      if (useGPT) {
        url.searchParams.set("provider", "gpt");
      }
      if (useTarget && targetLang && targetLang !== lang) {
        url.searchParams.set("target", targetLang);
      }

      promise = fetch(url.toString()).then((res) =>
        res.json()
      ) as Promise<DictResponse>;
      dictCache.set(computeKey(), promise);
    }
    setLoading(true);
    try {
      const resp = await promise;
      setData(resp);
      setSource(resp.source);
      if (resp.source === "wiktionary") setHasWiki(true);
      return resp;
    } finally {
      setLoading(false);
    }
  }, [lang, useTarget, targetLang, useGPT, currentWord]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const maybeUpdate = async () => {
      const promise = dictCache.get(computeKey());
      if (promise) {
        const resp = await promise;
        if (!cancelled) setData(resp);
      } else {
        await fetchDefinition();
      }
    };
    maybeUpdate();
    return () => {
      cancelled = true;
    };
  }, [open, computeKey]);

  /* ------------------------------ Events ------------------------------ */
  const openPopover = () => {
    setOpen(true);
    fetchDefinition();
  };
  const closePopover = () => setOpen(false);

  // Long-press on touch devices
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(openPopover, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /* ------------------------------ Render ------------------------------ */
  const renderContent = () => {
    if (loading && !data)
      return <p className="text-sm text-center">Loading…</p>;
    if (data && data.defs.length === 0)
      return <p className="text-sm text-center">No definition found.</p>;
    if (!data) return null;

    const providerPill = (
      <span
        className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-semibold",
          source === "db"
            ? "bg-gray-100 text-gray-600"
            : source === "google"
              ? "bg-indigo-100 text-indigo-600"
              : "bg-emerald-100 text-emerald-600"
        )}
      >
        {source === "db" ? "DB" : source === "google" ? "Gemini" : "GPT"}
      </span>
    );

    return (
      <div className="flex flex-col h-full w-full justify-center">
        {/* Header bar */}
        <div
          className="relative px-3 py-1.5 rounded-t-md flex items-center"
          style={{ background: "#3C18D9", color: "#fff" }}
        >
          {/* Back / close */}
          <button
            className="text-xs underline z-10"
            onClick={() => {
              if (wordStack.length) {
                const prev = wordStack[wordStack.length - 1];
                setWordStack((s) => s.slice(0, -1));
                setCurrentWord(prev);
                setData(null);
              } else {
                setOpen(false);
              }
            }}
          >
            {wordStack.length ? "← back" : "×"}
          </button>

          {/* Center word with pronunciation button */}
          <div className="absolute inset-0 flex items-center justify-center gap-1 text-med font-bold truncate">
            <span>{currentWord}</span>
            <button
              aria-label="Play pronunciation"
              onClick={async () => {
                try {
                  const res = await fetch("/api/chat/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: currentWord, voice: "nova" }),
                  });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  audio.play();
                  audio.addEventListener("ended", () =>
                    URL.revokeObjectURL(url)
                  );
                } catch (e) {
                  console.error("Failed to play TTS", e);
                }
              }}
              className="text-white hover:text-gray-200 focus:outline-none"
            >
              <Volume2 size={14} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto z-10">
            {providerPill}
            <button
              aria-label={saved ? "Remove from wordlist" : "Add to wordlist"}
              onClick={toggle}
              className="text-yellow-300 cursor-pointer"
            >
              {saved ? (
                <Star fill="currentColor" size={16} />
              ) : (
                <StarOff size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Language toggle (Switch) */}
        {targetLang && targetLang !== lang && (
          <div className="flex items-center justify-center gap-1 py-2 mt-1 text-xs font-bold select-none">
            <span style={{ opacity: !useTarget ? 1 : 0.5 }}>
              {lang.toUpperCase()}
            </span>
            <Switch
              onChange={() => setUseTarget((v) => !v)}
              checked={useTarget}
              uncheckedIcon={false}
              checkedIcon={false}
              onColor={interfaceColor}
              offColor={interfaceColor}
              height={14}
              width={28}
              handleDiameter={12}
            />
            <span style={{ opacity: useTarget ? 1 : 0.5 }}>
              {targetLang.toUpperCase()}
            </span>
          </div>
        )}

        {/* Definitions list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 text-left text-med">
          {data.defs.map((d, i) => (
            <div key={i} className="">
              <p className="font-semibold mb-1">
                {d.pos}: {tokenizeDef(d.sense)}
              </p>
              {d.examples.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {d.examples.map((ex, j) => (
                    <li key={j} className="italic opacity-80">
                      {tokenizeDef(ex)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // tokenize definition/ex sentences to clickable words
  const tokenizeDef = (text: string) => {
    // Updated regex to include Unicode categories for combining marks (Mn), spacing marks (Mc), and enclosing marks (Me)
    const parts = text.match(
      /([\p{L}\p{Mn}\p{Mc}\p{Me}'']+|\s+|[^\p{L}\p{Mn}\p{Mc}\p{Me}\s]+)/gu
    ) || [text];
    return parts.map((tok, idx) => {
      // Updated word test to include diacritical marks
      const isWord = /^[\p{L}\p{Mn}\p{Mc}\p{Me}'']+$/u.test(tok);
      if (isWord) {
        return (
          <span
            key={idx}
            style={{ textDecoration: "none" }}
            className={cn(
              "cursor-pointer",
              isUser
                ? "hover:decoration-white hover:underline hover:decoration-2"
                : "hover:decoration-[#170664] hover:underline hover:decoration-2",
              "relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 active:after:scale-x-100 after:transition-all after:duration-300 after:ease-out"
            )}
            onClick={() => {
              setWordStack((s) => [...s, currentWord]);
              setCurrentWord(tok.toLowerCase());
              setData(null);
              setUseGPT(false);
            }}
          >
            {tok}
          </span>
        );
      }
      return <React.Fragment key={idx}>{tok}</React.Fragment>;
    });
  };

  const underlineColor = isUser ? "#FFFFFF" : "#3C18D9";

  const interactiveClasses = cn(
    "relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring",
    highlight && "decoration-dotted underline",
    isUser
      ? "hover:decoration-white hover:underline hover:decoration-2"
      : "hover:decoration-[#3C18D9] hover:underline hover:decoration-2",
    // animated underline bar thicker; trigger on hover AND active (touch)
    "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 active:after:scale-x-100 after:transition-all after:duration-300 after:ease-out"
  );

  const animatedStyle = {
    "--uline": underlineColor,
    textDecoration: "none", // Ensure no default underline
  } as React.CSSProperties;

  /* ------------------------- Draggable popover ------------------------ */
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDownDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX - drag.x, y: e.clientY - drag.y };
    setIsDragging(true);
    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", onMouseUpDrag);
  };

  const onMouseMoveDrag = (e: MouseEvent) => {
    if (!dragStart.current) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const onMouseUpDrag = () => {
    dragStart.current = null;
    window.removeEventListener("mousemove", onMouseMoveDrag);
    window.removeEventListener("mouseup", onMouseUpDrag);
    setIsDragging(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={openPopover}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPopover();
            }
          }}
          onMouseEnter={() => {
            /* Disabled eager prefetch to cut down network calls */
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={cn(interactiveClasses, className)}
          style={animatedStyle}
          {...props}
        >
          {initialWord}
        </span>
      </PopoverTrigger>
      <PopoverContent asChild sideOffset={4}>
        <div
          onMouseDown={onMouseDownDrag}
          style={{
            width: 320,
            height: 260,
            transform: `translate(${drag.x}px, ${drag.y}px)`,
            cursor: isDragging ? "grabbing" : "grab",
          }}
          className="bg-white dark:bg-slate-800 overflow-y-auto rounded-md shadow-lg"
        >
          {renderContent()}
        </div>
      </PopoverContent>
    </Popover>
  );
}
