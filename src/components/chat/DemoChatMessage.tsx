import { Message } from "ai";
import { Volume2 } from "lucide-react";
import { useRTL } from "@/app/hooks/useRTL";
import React from "react";
import { interfaceColor } from "@/lib/theme";
import { DemoWord } from "./DemoWord";
import { useCJKTokenizedText } from "@/hooks/useChineseTokenizedText";

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

  // Use CJK tokenization for Chinese text
  const { tokens: chineseTokens, loading: chineseLoading } =
    useCJKTokenizedText(
      typeof rawContent === "string" ? rawContent : "",
      langCode
    );

  const tokenize = (text: string) => {
    // For Chinese text, use the CJK tokenizer with robust fallback
    if (langCode === "zh") {
      if (chineseLoading) {
        // Show raw text while loading
        return <span>{text}</span>;
      }
      if (chineseTokens && chineseTokens.length > 0) {
        return chineseTokens.map((token, idx) => {
          if (token.isChinese) {
            return (
              <DemoWord
                key={idx}
                initialWord={token.word}
                lang={settings?.selectedLanguage || "en"}
                targetLang={settings?.nativeLanguage}
                isUser={message.role === "user"}
              >
                {token.word}
              </DemoWord>
            );
          }
          return <React.Fragment key={idx}>{token.word}</React.Fragment>;
        });
      }
      // Fallback: use regex-based tokenization if no tokens
    }

    // Regex-based tokenization for all other cases
    const parts = text.match(
      /([a-zA-Z\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]+(?:'[a-zA-Z\u00C0-\u017F]+)?|\s+|[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06FF\u0590-\u05FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0370-\u03FF\u1F00-\u1FFF]+)/gu
    ) || [text];

    return parts.map((tok, idx) => {
      const isWord =
        /^[a-zA-Z\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+(?:'[a-zA-Z\u00C0-\u017F]+)?$/u.test(
          tok
        );
      if (isWord && tok.length > 0) {
        return (
          <DemoWord
            key={idx}
            initialWord={tok}
            lang={settings?.selectedLanguage || "en"}
            targetLang={settings?.nativeLanguage}
            isUser={message.role === "user"}
          >
            {tok}
          </DemoWord>
        );
      }
      return <React.Fragment key={idx}>{tok}</React.Fragment>;
    });
  };

  const messageContent =
    typeof rawContent === "string" ? tokenize(rawContent) : rawContent;

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
