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
import { INTERACTIVE_STYLES, TTS_TEXT_CLEANING } from "@/lib/constants";
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
import { tokenizeText } from "@/lib/composable-tokenizer";

interface WordProps extends React.HTMLAttributes<HTMLSpanElement> {
  initialWord: string;
  lang: string; // language of word (selectedLanguage)
  targetLang?: string | null; // user's native language
  /** Prefetched or highlighted word */
  highlight?: boolean;
  isUser?: boolean;
  /** Demo mode - uses demo wordlist functionality */
  isDemo?: boolean;
  // inside WordProps add provider toggling state
}

interface DictResponse {
  word: string;
  defs: Definition[];
  source: string;
}

// ClickableText component for rendering clickable words within popover content
interface ClickableTextProps {
  text: string;
  lang: string;
  onWordClick: (word: string) => void;
  className?: string;
}

function ClickableText({
  text,
  lang,
  onWordClick,
  className,
}: ClickableTextProps) {
  const [tokens, setTokens] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (["zh", "ja", "th"].includes(lang)) {
        const tokenObjs = await tokenizeText(text, lang);
        if (!cancelled) setTokens(tokenObjs.map((t) => t.word));
      } else {
        setTokens(null); // Use default split
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  // Helper to check if a string is punctuation (includes non-English marks)
  const PUNCTUATION_CHARS = [
    ...Object.keys(TTS_TEXT_CLEANING.PUNCTUATION_NORMALIZATION),
    ".",
    ",",
    "!",
    "?",
    ";",
    ":",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "'",
    '"',
    "`",
    "~",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "+",
    "=",
    "|",
    "\\",
    "/",
    "<",
    ">",
    "-",
  ];
  const PUNCTUATION_REGEX = new RegExp(
    `^[${PUNCTUATION_CHARS.map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join("")}]+$`
  );
  const isPunctuation = (word: string) => PUNCTUATION_REGEX.test(word);

  if (tokens) {
    // For CJK/Thai languages, render tokens without spaces
    if (["zh", "ja", "th"].includes(lang)) {
      return (
        <span className={className}>
          {tokens.map((word, index) => {
            if (isPunctuation(word)) {
              // Show punctuation but don't make it clickable
              return <span key={index}>{word}</span>;
            }
            return (
              <span
                key={index}
                className={cn(
                  INTERACTIVE_STYLES.UNDERLINE_CLASSES.base,
                  INTERACTIVE_STYLES.UNDERLINE_CLASSES.animated
                )}
                onClick={() => onWordClick(word.toLowerCase())}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    } else {
      // For non-CJK languages, render tokens with spaces
      return (
        <span className={className}>
          {tokens.map((word, index) => {
            if (isPunctuation(word)) {
              return <span key={index}>{word}</span>;
            }
            return (
              <React.Fragment key={index}>
                {index > 0 && <span> </span>}
                <span
                  className={cn(
                    INTERACTIVE_STYLES.UNDERLINE_CLASSES.base,
                    INTERACTIVE_STYLES.UNDERLINE_CLASSES.animated
                  )}
                  onClick={() => onWordClick(word.toLowerCase())}
                >
                  {word}
                </span>
              </React.Fragment>
            );
          })}
        </span>
      );
    }
  }

  // Fallback: original logic for non-CJK/Thai
  const words = text.split(/(\s+|[.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>-])/);
  return (
    <span className={className}>
      {words.map((word, index) => {
        if (!word || /^\s+$/.test(word)) {
          return <span key={index}>{word}</span>;
        }
        if (isPunctuation(word)) {
          return <span key={index}>{word}</span>;
        }
        // Add a space before each word except the first (for non-CJK/Thai)
        return (
          <React.Fragment key={index}>
            {index > 0 && !/^\s+$/.test(words[index - 1]) && <span> </span>}
            <span
              className={cn(
                INTERACTIVE_STYLES.UNDERLINE_CLASSES.base,
                INTERACTIVE_STYLES.UNDERLINE_CLASSES.animated
              )}
              onClick={() => onWordClick(word.toLowerCase())}
            >
              {word}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
}

// Module-level cache shared across component instances
const dictCache = new Map<string, Promise<DictResponse>>();

// Helper function to parse translatedSense format: "word (definition)"
function parseTranslation(
  text: string
): { word: string; definition: string } | null {
  const match = text.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return {
      word: match[1].trim(),
      definition: match[2].trim(),
    };
  }
  return null;
}

export function Word({
  initialWord,
  lang,
  targetLang,
  highlight,
  isUser = false,
  isDemo = false,
  className,
  ...props
}: WordProps) {
  console.log("[Word] Component rendered with props:", {
    initialWord,
    lang,
    targetLang,
    isUser,
    isDemo,
  });

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

  // Use the same wordlist hook for both demo and regular modes
  const { saved, toggle: originalToggle } = useWordSaved(currentWord, lang);

  // Wrap the toggle function to show demo message when in demo mode
  const toggle = async () => {
    if (isDemo) {
      alert("Sign up to save words to your wordlist!");
      return;
    }
    await originalToggle();
  };

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

  const computeKey = useCallback(
    () =>
      `${lang}:${useTarget && targetLang ? targetLang : lang}:${currentWord.toLowerCase()}`,
    [lang, useTarget, targetLang, currentWord]
  );

  /* ----------------------------- Fetching ----------------------------- */
  const fetchDefinition = useCallback(async () => {
    console.log("[Word] fetchDefinition called with:", {
      currentWord,
      lang,
      useTarget,
      targetLang,
    });

    let promise = dictCache.get(computeKey());
    if (!promise) {
      const url = new URL(`/api/dict`, window.location.origin);
      url.searchParams.set("lang", lang);
      url.searchParams.set("word", currentWord);
      if (useTarget && targetLang && targetLang !== lang) {
        url.searchParams.set("target", targetLang);
      }

      console.log("[Word] Making API call to:", url.toString());

      promise = fetch(url.toString()).then((res) =>
        res.json()
      ) as Promise<DictResponse>;
      dictCache.set(computeKey(), promise);
    }
    setLoading(true);
    try {
      const resp = await promise;
      console.log("[Word] API response:", resp);
      setData(resp);
      setSource(resp.source);

      return resp;
    } catch (error) {
      console.error("[Word] API error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [lang, useTarget, targetLang, currentWord, computeKey]);

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
  }, [open, computeKey, fetchDefinition]);

  /* ------------------------------ Events ------------------------------ */
  const openPopover = () => {
    console.log("[Word] openPopover called with currentWord:", currentWord);
    console.log("[Word] Component props:", {
      initialWord,
      lang,
      targetLang,
      isUser,
    });
    setOpen(true);
    fetchDefinition();
  };

  // Long-press on touch devices
  const handleTouchStart = () => {
    console.log("[Word] handleTouchStart called");
    longPressTimer.current = setTimeout(openPopover, 500);
  };
  const handleTouchEnd = () => {
    console.log("[Word] handleTouchEnd called");
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /* ------------------------------ Render ------------------------------ */
  // Handler for when words are clicked within the popover
  // Helper to check if a string is punctuation (includes non-English marks)
  const PUNCTUATION_CHARS = [
    ...Object.keys(TTS_TEXT_CLEANING.PUNCTUATION_NORMALIZATION),
    ".",
    ",",
    "!",
    "?",
    ";",
    ":",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "'",
    '"',
    "`",
    "~",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "+",
    "=",
    "|",
    "\\",
    "/",
    "<",
    ">",
    "-",
  ];
  const PUNCTUATION_REGEX = new RegExp(
    `^[${PUNCTUATION_CHARS.map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join("")}]+$`
  );
  const isPunctuation = (w: string) => PUNCTUATION_REGEX.test(w);

  const handlePopoverWordClick = (word: string) => {
    if (isPunctuation(word)) {
      // Ignore punctuation clicks
      return;
    }
    console.log("[Word] Word clicked in popover:", word);
    setWordStack((s) => [...s, currentWord]);
    setCurrentWord(word.toLowerCase());
    setData(null);
  };

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
                  console.log(
                    "[Word] TTS button clicked for word:",
                    convertedWord
                  );

                  const res = await fetch("/api/chat/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      text: convertedWord,
                      voice: "nova",
                    }),
                  });

                  if (!res.ok) {
                    const errorText = await res.text();
                    console.error(
                      "[Word] TTS API error:",
                      res.status,
                      errorText
                    );
                    return;
                  }

                  // Parse the JSON response with base64encoded chunks
                  const data = await res.json();
                  if (
                    !data.chunks ||
                    !Array.isArray(data.chunks) ||
                    data.chunks.length === 0
                  ) {
                    console.error(
                      "[Word] Invalid TTS response format or empty chunks"
                    );
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
                  console.log("[Word] TTS blob created:", {
                    size: blob.size,
                    type: blob.type,
                  });

                  if (blob.size === 0) {
                    console.error("[Word] Empty audio blob created");
                    return;
                  }

                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);

                  audio.addEventListener("loadstart", () =>
                    console.log("[Word] Audio loading started")
                  );
                  audio.addEventListener("canplay", () =>
                    console.log("[Word] Audio can play")
                  );
                  audio.addEventListener("play", () =>
                    console.log("[Word] Audio started playing")
                  );
                  audio.addEventListener("ended", () => {
                    console.log("[Word] Audio ended");
                    URL.revokeObjectURL(url);
                  });
                  audio.addEventListener("error", (e) => {
                    console.error("[Word] Audio playback error:", e);
                    URL.revokeObjectURL(url);
                  });

                  await audio.play();
                } catch (e) {
                  console.error("[Word] Failed to play TTS:", e);
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
          {data.defs.map((d, i) => {
            const displayText =
              useTarget && d.translatedSense ? d.translatedSense : d.sense;
            const parsedTranslation = parseTranslation(displayText);

            return (
              <div key={i} className="">
                <p className="font-semibold mb-1">
                  {d.pos}:{" "}
                  {parsedTranslation ? (
                    <ClickableText
                      text={parsedTranslation.word}
                      lang={useTarget && targetLang ? targetLang : lang}
                      onWordClick={handlePopoverWordClick}
                    />
                  ) : (
                    <ClickableText
                      text={displayText}
                      lang={useTarget && targetLang ? targetLang : lang}
                      onWordClick={handlePopoverWordClick}
                    />
                  )}
                </p>
                {parsedTranslation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    (
                    <ClickableText
                      text={parsedTranslation.definition}
                      lang={useTarget && targetLang ? targetLang : lang}
                      onWordClick={handlePopoverWordClick}
                    />
                    )
                  </p>
                )}
                {!useTarget && d.translatedSense && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 italic">
                    <ClickableText
                      text={d.translatedSense}
                      lang={targetLang || lang}
                      onWordClick={handlePopoverWordClick}
                    />
                  </p>
                )}
                {useTarget && d.sense !== d.translatedSense && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 italic">
                    <ClickableText
                      text={d.sense}
                      lang={lang}
                      onWordClick={handlePopoverWordClick}
                    />
                  </p>
                )}
                {d.examples.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5">
                    {d.examples.map((ex, j) => (
                      <li key={j} className="italic opacity-80">
                        <ClickableText
                          text={ex}
                          lang={useTarget && targetLang ? targetLang : lang}
                          onWordClick={handlePopoverWordClick}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
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

  // Async tokenization function that uses the new tokenizer for all languages
  const tokenizeDefAsync = useCallback(
    async (text: string): Promise<React.ReactNode[]> => {
      console.log("[Word] tokenizeDefAsync called with:", { text, lang });

      if (!text || typeof text !== "string") {
        console.log("[Word] Empty or invalid text, returning empty array");
        return [];
      }

      // Check if we already have this text tokenized
      if (tokenizedTexts.has(text)) {
        console.log("[Word] Using cached tokenization for:", text);
        return tokenizedTexts.get(text)!;
      }

      // Check if we're already tokenizing this text
      if (tokenizationLoading.has(text)) {
        console.log("[Word] Tokenization already in progress for:", text);
        return [<span key="loading">Loading...</span>];
      }

      // Mark as loading
      setTokenizationLoading((prev) => new Set(prev).add(text));
      console.log("[Word] Starting tokenization for:", text);

      try {
        // Use the new unified tokenizer
        const tokens = await tokenizeText(text, lang);
        console.log("[Word] Received tokens from tokenizer:", tokens);

        // Convert tokens to React elements with proper spacing
        const tokenElements: React.ReactNode[] = [];
        tokens.forEach((token, idx) => {
          // Add space before token if it's not the first token
          if (idx > 0) {
            tokenElements.push(<span key={`space-${idx}`}> </span>);
          }

          // --- Furigana extension point ---
          // If token.reading exists (Japanese), you can render furigana here in the future
          tokenElements.push(
            <span
              key={idx}
              style={{ textDecoration: "none" }}
              className={cn(
                INTERACTIVE_STYLES.UNDERLINE_CLASSES.base,
                INTERACTIVE_STYLES.UNDERLINE_CLASSES.animated
              )}
              onClick={() => {
                setWordStack((s) => [...s, currentWord]);
                setCurrentWord(token.word.toLowerCase());
                setData(null);
              }}
            >
              {/* For future: render <ruby>{token.word}<rt>{token.reading}</rt></ruby> if token.reading exists */}
              {token.word}
            </span>
          );
        });

        console.log("[Word] Created token elements:", tokenElements.length);

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
        console.log("[Word] Tokenization completed for:", text);
      }
    },
    [lang, tokenizedTexts, tokenizationLoading, isUser, currentWord]
  );

  // Effect to tokenize text when data changes
  useEffect(() => {
    if (!data || !open) return;
    // For each definition, tokenize the main word/phrase and translation if present
    const tokenizeAll = async () => {
      if (!data) return;
      for (const d of data.defs) {
        const displayText =
          useTarget && d.translatedSense ? d.translatedSense : d.sense;
        if (!tokenizedTexts.has(displayText)) {
          await tokenizeDefAsync(displayText);
        }
        if (d.translatedSense && !tokenizedTexts.has(d.translatedSense)) {
          await tokenizeDefAsync(d.translatedSense);
        }
        if (d.sense && !tokenizedTexts.has(d.sense)) {
          await tokenizeDefAsync(d.sense);
        }
        for (const ex of d.examples) {
          if (!tokenizedTexts.has(ex)) {
            await tokenizeDefAsync(ex);
          }
        }
      }
    };
    tokenizeAll();
  }, [
    data,
    open,
    useTarget,
    tokenizedTexts,
    tokenizationLoading,
    tokenizeDefAsync,
  ]);

  // Helper function to get tokenized text from cache or fallback
  const getTokenizedText = (text: string): React.ReactNode[] => {
    if (tokenizedTexts.has(text)) {
      return tokenizedTexts.get(text)!;
    }
    // Fallback: show plain text
    return [<span key="fallback">{text}</span>];
  };

  const underlineColor = isUser ? "#FFFFFF" : "#3C18D9";

  const interactiveClasses = cn(
    "relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring",
    highlight && "decoration-dotted underline",
    INTERACTIVE_STYLES.UNDERLINE_CLASSES.animated
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
          onClick={(e) => {
            console.log("[Word] Click event triggered on word:", convertedWord);
            console.log("[Word] Event target:", e.target);
            openPopover();
          }}
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
