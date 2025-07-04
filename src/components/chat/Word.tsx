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

    return (
      <div className="relative space-y-2 max-w-xs pb-10 text-center">
        {targetLang && targetLang !== lang && (
          <div className="flex items-center justify-center gap-2 mb-2 text-xs font-bold select-none">
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
              height={16}
              width={32}
              handleDiameter={14}
            />
            <span style={{ opacity: useTarget ? 1 : 0.5 }}>
              {targetLang.toUpperCase()}
            </span>
          </div>
        )}
        {/* Provider selector or GPT label */}
        <div className="absolute bottom-1 right-1 flex items-center justify-center">
          {hasWiki ? (
            <select
              value={useGPT ? "gpt" : "wiki"}
              onChange={(e) => setUseGPT(e.target.value === "gpt")}
              className="bg-white dark:bg-slate-800 border border-solid border-gray-300 dark:border-slate-600 text-xs rounded p-1 pr-5 focus:outline-none"
            >
              <option value="wiki">Wiki</option>
              <option value="gpt">GPT</option>
            </select>
          ) : (
            <span className="text-[10px] opacity-60">
              {source === "db"
                ? "via DB"
                : source === "google"
                  ? "via Gemini"
                  : "via GPT"}
            </span>
          )}
        </div>
        {/* Back button */}
        <button
          className="absolute left-1 top-1 text-xs text-blue-600 dark:text-blue-400 underline"
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
        <div className="px-6">
          {data.defs.map((d, i) => (
            <div key={i} className="text-sm">
              <p className="font-semibold">
                {d.pos}:{" "}
                <span className="font-normal">{tokenizeDef(d.sense)}</span>
              </p>
              {d.examples.length > 0 && (
                <ul className="list-disc list-inside">
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
              "relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-all after:duration-300 after:ease-out"
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
    // animated underline bar thicker
    "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-all after:duration-300 after:ease-out"
  );

  const animatedStyle = {
    "--uline": underlineColor,
    textDecoration: "none", // Ensure no default underline
  } as React.CSSProperties;

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
      <PopoverContent className="bg-white dark:bg-slate-800" sideOffset={4}>
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}
