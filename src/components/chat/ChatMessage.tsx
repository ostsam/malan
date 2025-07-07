import { Message } from "ai";
import { Volume2 } from "lucide-react";
import { useRTL } from "@/app/hooks/useRTL";
import React, { useState, useEffect, useCallback } from "react";
import { interfaceColor } from "@/lib/theme";
import { Word } from "./Word";
import { tokenizeText, TokenizedWord } from "@/lib/tokenizer";

interface ChatSettings {
  selectedLanguage?: string;
  nativeLanguage?: string;
}

interface ChatMessageProps {
  message: Message;
  settings: ChatSettings;
  onSpeak: (text: string) => void;
  renderMessageContent: (content: Message["content"]) => string;
}

function ChatMessageBase({
  message,
  settings,
  onSpeak,
  renderMessageContent,
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

      console.log("[ChatMessage] Tokenizing content:", { text, langCode });
      setIsTokenizing(true);

      try {
        const tokens: TokenizedWord[] = await tokenizeText(text, langCode);
        console.log("[ChatMessage] Received tokens:", tokens);

        const tokenElements: React.ReactNode[] = [];

        // Separate tokens with and without positions
        const positionedTokens = tokens.filter(
          (token) => token.start !== undefined
        );
        const unpositionedTokens = tokens.filter(
          (token) => token.start === undefined
        );

        console.log("[ChatMessage] Positioned tokens:", positionedTokens);
        console.log("[ChatMessage] Unpositioned tokens:", unpositionedTokens);

        if (positionedTokens.length > 0) {
          // Sort tokens by start position to ensure correct order
          const sortedTokens = positionedTokens.sort(
            (a, b) => (a.start || 0) - (b.start || 0)
          );

          console.log("[ChatMessage] Sorted tokens:", sortedTokens);

          let lastEnd = 0;

          sortedTokens.forEach((token, idx) => {
            const start = token.start || 0;
            const end = token.end || start + token.word.length;

            console.log("[ChatMessage] Processing token:", {
              token,
              start,
              end,
              idx,
            });

            // Skip if this token overlaps with the previous one
            if (start < lastEnd) {
              console.log(
                "[ChatMessage] Skipping overlapping token:",
                token.word
              );
              return;
            }

            // Add any text between the last token and this one (preserves original spacing)
            if (start > lastEnd) {
              const spacingText = text.slice(lastEnd, start);
              console.log(
                "[ChatMessage] Spacing text found:",
                spacingText,
                "for language:",
                langCode,
                "token language:",
                token.language,
                "isJapanese:",
                token.isJapanese,
                "isChinese:",
                token.isChinese
              );

              // Check if the current token contains non-Latin script characters
              const hasNonLatinScript =
                /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
                  token.word
                );

              // Only add spacing for Latin script tokens
              if (spacingText && !hasNonLatinScript) {
                console.log(
                  "[ChatMessage] Adding spacing text for Latin script:",
                  spacingText
                );
                tokenElements.push(
                  <span key={`spacing-${idx}`}>{spacingText}</span>
                );
              } else if (spacingText && hasNonLatinScript) {
                console.log(
                  "[ChatMessage] Skipping spacing text for non-Latin script:",
                  spacingText
                );
              }
            }

            // Add the token
            console.log(
              "[ChatMessage] Creating Word component for:",
              token.word
            );
            tokenElements.push(
              <Word
                key={idx}
                initialWord={token.word}
                lang={langCode}
                targetLang={settings?.nativeLanguage}
                isUser={isUser}
              >
                {token.word}
              </Word>
            );

            lastEnd = end;
          });

          // Add any remaining text after the last token
          if (lastEnd < text.length) {
            const remainingText = text.slice(lastEnd);
            console.log(
              "[ChatMessage] Remaining text found:",
              remainingText,
              "for language:",
              langCode
            );
            if (remainingText) {
              console.log(
                "[ChatMessage] Adding remaining text:",
                remainingText
              );
              tokenElements.push(<span key="remaining">{remainingText}</span>);
            }
          }
        } else if (unpositionedTokens.length > 0) {
          // Handle tokens without positions by placing them sequentially
          console.log("[ChatMessage] Using unpositioned tokens sequentially");
          unpositionedTokens.forEach((token, idx) => {
            console.log(
              "[ChatMessage] Creating Word component for unpositioned token:",
              token.word
            );
            tokenElements.push(
              <Word
                key={idx}
                initialWord={token.word}
                lang={langCode}
                targetLang={settings?.nativeLanguage}
                isUser={isUser}
              >
                {token.word}
              </Word>
            );
          });
        } else {
          // Fallback: treat the entire text as a single word
          console.log(
            "[ChatMessage] No tokens found, treating as single word:",
            text
          );
          tokenElements.push(
            <Word
              key="fallback"
              initialWord={text}
              lang={langCode}
              targetLang={settings?.nativeLanguage}
              isUser={isUser}
            >
              {text}
            </Word>
          );
        }

        console.log(
          "[ChatMessage] Created token elements:",
          tokenElements.length,
          "Elements:",
          tokenElements
        );
        return tokenElements;
      } catch (error) {
        console.error("[ChatMessage] Error tokenizing content:", error);
        // Fallback to raw text
        return [<span key="fallback">{text}</span>];
      } finally {
        setIsTokenizing(false);
      }
    },
    [langCode, settings?.nativeLanguage, isUser]
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

  return (
    <div
      className={`flex flex-col my-2 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`relative group max-w-[85%] mb-1.5 rounded-2xl shadow-xs p-3 text-md break-words whitespace-pre-wrap border-1 ${
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
    </div>
  );
}

export const ChatMessage = React.memo(ChatMessageBase);
