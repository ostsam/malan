import { Message } from "ai";
import { Volume2 } from "lucide-react";
import { useRTL } from "@/app/hooks/useRTL";
import React, { useState, useEffect, useCallback } from "react";
import { interfaceColor } from "@/lib/theme";
import { Word } from "./Word";
import { tokenizeText, TokenizedWord } from "@/lib/composable-tokenizer";
import { formatDistanceToNow } from "date-fns";
import type { ChatSettings } from "@/app/tools/chat-store";

interface ChatMessageProps {
  message: Message;
  settings: ChatSettings;
  onSpeak: (text: string) => void;
  renderMessageContent: (content: Message["content"]) => string;
  /** Demo mode - uses demo wordlist functionality */
  isDemo?: boolean;
}

function ChatMessageBase({
  message,
  settings,
  onSpeak,
  renderMessageContent,
  isDemo = false,
}: ChatMessageProps) {
  const { rtlStyles, languageCode } = useRTL({
    selectedLanguage: settings?.selectedLanguage,
    nativeLanguage: settings?.nativeLanguage,
  });

  const isUser = message.role === "user";
  const rawContent = renderMessageContent(message.content);
  const langCode = settings?.selectedLanguage || "en";

  // State for tokenized content
  const [tokenizedContent, setTokenizedContent] = useState<
    React.ReactNode[] | null
  >(null);
  const [isTokenizing, setIsTokenizing] = useState(false);

  // Tokenize content using the new unified tokenizer
  const tokenizeContent = useCallback(
    async (text: string) => {
      if (!text || typeof text !== "string") {
        return [];
      }

      setIsTokenizing(true);

      try {
        const tokens: TokenizedWord[] = await tokenizeText(text, langCode);

        const tokenElements: React.ReactNode[] = [];

        // Separate tokens with and without positions
        const positionedTokens = tokens.filter(
          (token) => token.start !== undefined
        );
        const unpositionedTokens = tokens.filter(
          (token) => token.start === undefined
        );

        if (positionedTokens.length > 0) {
          // Sort tokens by start position to ensure correct order
          const sortedTokens = positionedTokens.sort(
            (a, b) => (a.start || 0) - (b.start || 0)
          );

          let lastEnd = 0;

          sortedTokens.forEach((token, idx) => {
            const start = token.start || 0;
            const end = token.end || start + token.word.length;

            // Skip if this token overlaps with the previous one
            if (start < lastEnd) {
              return;
            }

            // Add any text between the last token and this one (preserves original spacing)
            if (start > lastEnd) {
              const spacingText = text.slice(lastEnd, start);

              // Check if the current token contains non-Latin script characters
              const hasNonLatinScript =
                /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
                  token.word
                );

              // Only add spacing for Latin script tokens
              if (spacingText && !hasNonLatinScript) {
                tokenElements.push(
                  <span key={`spacing-${idx}`}>{spacingText}</span>
                );
              }
            }

            // Check if this is punctuation - only for Japanese (since Chinese handles punctuation differently)
            const isJapanesePunctuation =
              langCode === "ja" &&
              /^[。、！？：；""''（）【】「」『』…—]+$/.test(token.word);

            if (isJapanesePunctuation) {
              // Display Japanese punctuation as plain text
              tokenElements.push(<span key={idx}>{token.word}</span>);
            } else {
              // Display regular words as clickable Word components
              tokenElements.push(
                <Word
                  key={idx}
                  initialWord={token.word}
                  lang={langCode}
                  targetLang={settings?.nativeLanguage}
                  isUser={isUser}
                  isDemo={isDemo}
                >
                  {token.word}
                </Word>
              );
            }

            lastEnd = end;
          });

          // Add any remaining text after the last token
          if (lastEnd < text.length) {
            const remainingText = text.slice(lastEnd);
            if (remainingText) {
              tokenElements.push(<span key="remaining">{remainingText}</span>);
            }
          }
        } else if (unpositionedTokens.length > 0) {
          // Handle tokens without positions by placing them sequentially
          unpositionedTokens.forEach((token, idx) => {
            tokenElements.push(
              <Word
                key={idx}
                initialWord={token.word}
                lang={langCode}
                targetLang={settings?.nativeLanguage}
                isUser={isUser}
                isDemo={isDemo}
              >
                {token.word}
              </Word>
            );
          });
        } else {
          // Fallback: treat the entire text as a single word
          tokenElements.push(
            <Word
              key="fallback"
              initialWord={text}
              lang={langCode}
              targetLang={settings?.nativeLanguage}
              isUser={isUser}
              isDemo={isDemo}
            >
              {text}
            </Word>
          );
        }

        // console.log(
        //   "[ChatMessage] Created token elements:",
        //   tokenElements.length,
        //   "Elements:",
        //   tokenElements
        // );
        return tokenElements;
      } catch (error) {
        console.error("[ChatMessage] Error tokenizing content:", error);
        // Fallback to raw text
        return [<span key="fallback">{text}</span>];
      } finally {
        setIsTokenizing(false);
      }
    },
    [settings, isUser]
  );

  // Tokenize content when it changes
  useEffect(() => {
    if (typeof rawContent === "string") {
      tokenizeContent(rawContent).then(setTokenizedContent);
    } else {
      setTokenizedContent(null);
    }
  }, [rawContent, tokenizeContent]);

  const messageContent =
    tokenizedContent ||
    (isTokenizing ? <span>Loading...</span> : <span>{rawContent}</span>);

  const handleSpeak = () => {
    if (typeof rawContent === "string" && rawContent.trim().length > 0) {
      onSpeak(rawContent);
    }
  };

  // Debug: Log message data - REMOVED
  // Timestamp format updated - cache bust
  // All console logs removed - final cleanup

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`relative group max-w-[85%] rounded-2xl shadow-xs p-3 text-md break-words whitespace-pre-wrap border-1 ${
          isUser
            ? "bg-[#3C18D9] text-white border-color-[#170664] rounded-br-none"
            : "bg-[#F1EFFC] dark:bg-[#170664 border-color-[#c4c7bd] rounded-bl-none"
        }`}
        style={rtlStyles}
        lang={languageCode}
      >
        <div className="pb-5">{messageContent}</div>
        <button
          onClick={handleSpeak}
          className={`absolute bottom-1 ${
            isUser ? "left-1" : "right-1"
          } p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors duration-200`}
          aria-label="Read message aloud"
          style={{
            color: isUser ? "#F1EFFC" : interfaceColor,
          }}
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      {message.createdAt && (
        <div
          className="text-xs text-muted-foreground mt-1 cursor-help"
          title={`${new Date(message.createdAt).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })} at ${new Date(message.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}`}
        >
          {(() => {
            const now = new Date();
            const messageDate = new Date(message.createdAt);
            const diffInHours =
              (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
              // Show time for messages within 24 hours
              return messageDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
            } else {
              // Show "X days ago" for older messages
              const diffInDays = Math.floor(diffInHours / 24);
              return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
            }
          })()}
        </div>
      )}
      {!message.createdAt && (
        <div className={`text-xs opacity-60 mt-1`} style={{ color: "#666" }}>
          No timestamp
        </div>
      )}
    </div>
  );
}

export const ChatMessage = React.memo(ChatMessageBase);
