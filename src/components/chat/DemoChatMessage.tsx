import { Message } from "ai";
import { Volume2 } from "lucide-react";
import { useRTL } from "@/app/hooks/useRTL";
import React, { useState, useEffect, useCallback } from "react";
import { interfaceColor } from "@/lib/theme";
import { DemoWord } from "./DemoWord";
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

function DemoChatMessageBase({
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

      console.log("[DemoChatMessage] Tokenizing content:", { text, langCode });
      setIsTokenizing(true);

      try {
        const tokens: TokenizedWord[] = await tokenizeText(text, langCode);
        console.log("[DemoChatMessage] Received tokens:", tokens);

        const tokenElements: React.ReactNode[] = [];

        if (tokens.length > 0) {
          // Sort tokens by start position to ensure correct order
          const sortedTokens = tokens.sort(
            (a, b) => (a.start || 0) - (b.start || 0)
          );

          console.log("[DemoChatMessage] Sorted tokens:", sortedTokens);

          let lastEnd = 0;

          sortedTokens.forEach((token, idx) => {
            const start = token.start || 0;
            const end = token.end || start + token.word.length;

            console.log("[DemoChatMessage] Processing token:", {
              token,
              start,
              end,
              idx,
            });

            // Skip if this token overlaps with the previous one
            if (start < lastEnd) {
              console.log(
                "[DemoChatMessage] Skipping overlapping token:",
                token.word
              );
              return;
            }

            // Add any text between the last token and this one (preserves original spacing)
            if (start > lastEnd) {
              const spacingText = text.slice(lastEnd, start);
              console.log(
                "[DemoChatMessage] Spacing text found:",
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
                  "[DemoChatMessage] Adding spacing text for Latin script:",
                  spacingText
                );
                tokenElements.push(
                  <span key={`spacing-${idx}`}>{spacingText}</span>
                );
              } else if (spacingText && hasNonLatinScript) {
                console.log(
                  "[DemoChatMessage] Skipping spacing text for non-Latin script:",
                  spacingText
                );
              }
            }

            // Add the token
            console.log(
              "[DemoChatMessage] Creating Word component for:",
              token.word
            );
            tokenElements.push(
              <DemoWord
                key={idx}
                initialWord={token.word}
                lang={langCode}
                targetLang={settings?.nativeLanguage}
                isUser={isUser}
              >
                {token.word}
              </DemoWord>
            );

            lastEnd = end;
          });

          // Add any remaining text after the last token
          if (lastEnd < text.length) {
            const remainingText = text.slice(lastEnd);
            if (remainingText) {
              console.log(
                "[DemoChatMessage] Adding remaining text:",
                remainingText
              );
              tokenElements.push(<span key="remaining">{remainingText}</span>);
            }
          }
        }

        console.log(
          "[DemoChatMessage] Created token elements:",
          tokenElements.length
        );
        return tokenElements;
      } catch (error) {
        console.error("[DemoChatMessage] Error tokenizing content:", error);
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

export const DemoChatMessage = React.memo(DemoChatMessageBase);
