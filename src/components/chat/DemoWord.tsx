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
import { useDemoWordSaved } from "@/hooks/useDemoWordlist";

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

export function DemoWord({
  initialWord,
  lang,
  targetLang,
  highlight,
  isUser = false,
  className,
  ...props
}: WordProps) {
  const [useTarget, setUseTarget] = useState(false);
  const [hasWiki, setHasWiki] = useState<boolean>(false);
  const [source, setSource] = useState<string | null>(null);

  /* ------------------------------- State ------------------------------ */
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictResponse | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [wordStack, setWordStack] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>(initialWord);

  const { saved, toggle } = useDemoWordSaved(currentWord, lang);

  const computeKey = () =>
    `${lang}:${useTarget && targetLang ? targetLang : lang}:${currentWord.toLowerCase()}`;

  /* ----------------------------- Fetching ----------------------------- */
  const fetchDefinition = useCallback(async () => {
    let promise = dictCache.get(computeKey());
    if (!promise) {
      const url = new URL(`/api/dict`, window.location.origin);
      url.searchParams.set("lang", lang);
      url.searchParams.set("word", currentWord);
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
  }, [lang, useTarget, targetLang, currentWord]);

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
              <Volume2 className="h-3 w-3" />
            </button>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-2 ml-auto">
            {source && providerPill}
            <button
              aria-label={saved ? "Remove from wordlist" : "Add to wordlist"}
              onClick={toggle}
              className="text-white hover:text-gray-200 focus:outline-none cursor-pointer"
            >
              {saved ? (
                <Star className="h-4 w-4" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            {data.defs.map((def, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {def.pos}
                  </span>
                  {providerPill}
                </div>
                <p className="text-sm">
                  {useTarget && def.translatedSense
                    ? def.translatedSense
                    : def.sense}
                </p>
                {!useTarget && def.translatedSense && (
                  <p className="text-sm text-gray-600 italic">
                    {def.translatedSense}
                  </p>
                )}
                {useTarget && def.sense !== def.translatedSense && (
                  <p className="text-sm text-gray-600 italic">{def.sense}</p>
                )}
                {def.examples && def.examples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {def.examples.map((example, j) => (
                      <p key={j} className="text-xs text-gray-500 italic">
                        "{example}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer controls */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          {/* Target language toggle */}
          {targetLang && targetLang !== lang && (
            <div className="flex items-center justify-between text-xs">
              <span>Show translations in {targetLang}</span>
              <Switch
                checked={useTarget}
                onChange={setUseTarget}
                onColor={interfaceColor}
                height={16}
                width={28}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn(
            "cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded px-0.5",
            highlight && "bg-yellow-200 dark:bg-yellow-800",
            className
          )}
          onMouseDown={openPopover}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          {...props}
        >
          {initialWord}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 h-96 p-0"
        align="start"
        side="top"
        sideOffset={5}
      >
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}
