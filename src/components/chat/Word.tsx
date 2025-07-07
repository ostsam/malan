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
import { isChineseText } from "@/lib/chinese-tokenizer-server";
import { useJieba } from "@/hooks/useJieba";
import {
  convertChineseText,
  getUserChineseScriptPreference,
} from "@/lib/chinese-converter";
import { useOptimizedChineseWordPinyin } from "@/hooks/useOptimizedChineseTokenization";

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

  const [source, setSource] = useState<string | null>(null);

  /* ------------------------------- State ------------------------------ */
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictResponse | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [wordStack, setWordStack] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>(initialWord);
  const [chineseScript, setChineseScript] = useState<
    "traditional" | "simplified"
  >("simplified");
  const [convertedWord, setConvertedWord] = useState<string>(initialWord);

  const { saved, toggle } = useWordSaved(currentWord, lang);

  // Chinese-specific features
  const isChinese = lang === "zh" || isChineseText(currentWord);
  const { pinyin } = useOptimizedChineseWordPinyin(currentWord, lang === "zh", {
    toneType: "symbol",
  });

  // Jieba tokenization for Chinese text
  const { cut: jiebaCut, isReady: jiebaReady } = useJieba();

  // State for async tokenization
  const [tokenizedTexts, setTokenizedTexts] = useState<
    Map<string, React.ReactNode[]>
  >(new Map());
  const [tokenizationLoading, setTokenizationLoading] = useState<Set<string>>(
    new Set()
  );

  // Load Chinese script preference
  useEffect(() => {
    const userPreference = getUserChineseScriptPreference();
    setChineseScript(userPreference);
  }, []);

  // Convert word when Chinese script changes
  useEffect(() => {
    const convertWord = async () => {
      if (isChinese && currentWord) {
        try {
          const converted = await convertChineseText(
            currentWord,
            chineseScript
          );
          setConvertedWord(converted);
        } catch (error) {
          console.error("Error converting word:", error);
          setConvertedWord(currentWord);
        }
      } else {
        setConvertedWord(currentWord);
      }
    };

    convertWord();
  }, [currentWord, chineseScript, isChinese]);

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
            <div className="flex flex-col items-center">
              <span>{convertedWord}</span>
            </div>
            {/* Display pinyin for Chinese words */}
            {isChinese && pinyin && (
              <span className="text-sm opacity-80 font-normal">({pinyin})</span>
            )}
            <button
              aria-label="Play pronunciation"
              onClick={async () => {
                try {
                  const res = await fetch("/api/chat/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      text: convertedWord,
                      voice: "nova",
                    }),
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
            {source && providerPill}
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
                {d.pos}:{" "}
                {getTokenizedText(
                  useTarget && d.translatedSense ? d.translatedSense : d.sense
                )}
              </p>
              {!useTarget && d.translatedSense && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 italic">
                  {d.translatedSense}
                </p>
              )}
              {useTarget && d.sense !== d.translatedSense && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 italic">
                  {d.sense}
                </p>
              )}
              {d.examples.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {d.examples.map((ex, j) => (
                    <li key={j} className="italic opacity-80">
                      {getTokenizedText(ex)}
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

  // Helper function to detect if text contains any non-Latin script characters
  const isNonLatinScript = (text: string): boolean => {
    return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]/.test(
      text
    );
  };

  // Keep the original isCJKText for backward compatibility
  const isCJKText = (text: string): boolean => {
    return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text);
  };

  // Async tokenization function that uses jieba for Chinese text
  const tokenizeDefAsync = useCallback(
    async (text: string): Promise<React.ReactNode[]> => {
      if (!text || typeof text !== "string") {
        return [];
      }

      // Check if we already have this text tokenized
      if (tokenizedTexts.has(text)) {
        return tokenizedTexts.get(text)!;
      }

      // Check if we're already tokenizing this text
      if (tokenizationLoading.has(text)) {
        return [<span key="loading">Loading...</span>];
      }

      // Mark as loading
      setTokenizationLoading((prev) => new Set(prev).add(text));

      try {
        let tokens: string[];
        const isNonLatin = isNonLatinScript(text);

        // Use jieba for Chinese text if ready
        if (isChineseText(text) && jiebaReady) {
          console.log("[Word] Using jieba for Chinese text:", text);
          tokens = await jiebaCut(text);
        } else {
          // Fallback to regex for non-Chinese or when jieba not ready
          console.log("[Word] Using regex fallback for text:", text);
          const parts = text.match(
            /([a-zA-Z\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]+(?:'[a-zA-Z\u00C0-\u017F]+)?|\s+|[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]+)/gu
          ) || [text];
          tokens = parts.filter(
            (part) =>
              /^[a-zA-Z\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]+(?:'[a-zA-Z\u00C0-\u017F]+)?$/u.test(
                part
              ) && part.length > 0
          );
        }

        // Convert tokens to React elements with proper spacing
        const tokenElements: React.ReactNode[] = [];
        tokens.forEach((token, idx) => {
          // Add space before token if it's not a non-Latin script and not the first token
          if (!isNonLatin && idx > 0) {
            tokenElements.push(<span key={`space-${idx}`}> </span>);
          }

          tokenElements.push(
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
                setCurrentWord(token.toLowerCase());
                setData(null);
              }}
            >
              {token}
            </span>
          );
        });

        // Cache the result
        setTokenizedTexts((prev) => new Map(prev).set(text, tokenElements));
        return tokenElements;
      } catch (error) {
        console.error("[Word] Error tokenizing text:", error);
        // Fallback to original text
        return [<span key="fallback">{text}</span>];
      } finally {
        // Remove from loading set
        setTokenizationLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(text);
          return newSet;
        });
      }
    },
    [
      jiebaCut,
      jiebaReady,
      tokenizedTexts,
      tokenizationLoading,
      isUser,
      currentWord,
    ]
  );

  // Effect to tokenize text when data changes
  useEffect(() => {
    if (!data || !open) return;

    const tokenizeAllTexts = async () => {
      const textsToTokenize: string[] = [];

      // Collect all texts that need tokenization
      data.defs.forEach((def) => {
        const senseText =
          useTarget && def.translatedSense ? def.translatedSense : def.sense;
        if (senseText && !tokenizedTexts.has(senseText)) {
          textsToTokenize.push(senseText);
        }

        def.examples.forEach((example) => {
          if (example && !tokenizedTexts.has(example)) {
            textsToTokenize.push(example);
          }
        });
      });

      if (textsToTokenize.length === 0) return;

      // Mark texts as loading
      textsToTokenize.forEach((text) => {
        tokenizationLoading.add(text);
      });

      try {
        // Tokenize all texts in parallel
        const tokenizationPromises = textsToTokenize.map(async (text) => {
          const result = await tokenizeDefAsync(text);
          return { text, result };
        });

        const results = await Promise.all(tokenizationPromises);

        // Update state with results
        setTokenizedTexts((prev) => {
          const newMap = new Map(prev);
          results.forEach(({ text, result }) => {
            newMap.set(text, result);
          });
          return newMap;
        });
      } catch (error) {
        console.error("Error tokenizing texts:", error);
      } finally {
        // Clear loading state
        textsToTokenize.forEach((text) => {
          tokenizationLoading.delete(text);
        });
      }
    };

    tokenizeAllTexts();
  }, [data, open, useTarget, tokenizedTexts]);

  // Helper function to get tokenized text from cache or fallback
  const getTokenizedText = (text: string): React.ReactNode[] => {
    if (tokenizedTexts.has(text)) {
      return tokenizedTexts.get(text)!;
    }

    if (tokenizationLoading.has(text)) {
      return [
        <span key="loading" className="text-gray-400">
          Loading...
        </span>,
      ];
    }

    // Fallback to original tokenizeDefAsync for immediate display
    // This will trigger async tokenization and show loading state
    tokenizeDefAsync(text).catch(console.error);
    return [<span key="fallback">{text}</span>];
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
          {convertedWord}
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
          className="glassmorphic bg-white/80 dark:bg-slate-800/80 overflow-y-auto rounded-md shadow-lg backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50"
        >
          {renderContent()}
        </div>
      </PopoverContent>
    </Popover>
  );
}
