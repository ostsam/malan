import { Message } from "ai";
import { Volume2 } from "lucide-react";
import { useRTL } from "@/app/hooks/useRTL";
import React from "react";
import { interfaceColor } from "@/app/layout";
import { Word } from "./Word";

interface ChatMessageProps {
  message: Message;
  settings: any;
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

  const tokenize = (text: string) => {
    // Updated regex to include Unicode categories for combining marks (Mn), spacing marks (Mc), and enclosing marks (Me)
    const parts = text.match(
      /([\p{L}\p{Mn}\p{Mc}\p{Me}'']+|\s+|[^\p{L}\p{Mn}\p{Mc}\p{Me}\s]+)/gu
    ) || [text];
    return parts.map((token, idx) => {
      // Updated word test to include diacritical marks
      const isWord = /^[\p{L}\p{Mn}\p{Mc}\p{Me}'']+$/u.test(token);
      if (isWord) {
        return (
          <Word
            key={idx}
            initialWord={token}
            lang={langCode}
            targetLang={settings?.nativeLanguage || null}
            isUser={isUser}
          />
        );
      }
      return <React.Fragment key={idx}>{token}</React.Fragment>;
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

export const ChatMessage = React.memo(ChatMessageBase);
