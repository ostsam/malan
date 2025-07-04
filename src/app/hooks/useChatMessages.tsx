import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Message } from "ai";

export function useChatMessages(messages: Message[]) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const hasOverflow = container.scrollHeight > container.clientHeight;
      setIsOverflowing(hasOverflow);
    }
  }, [messages]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const renderMessageContent = (content: Message["content"]) => {
    if (typeof content === "string") {
      try {
        if (content.startsWith("[") && content.endsWith("]")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed[0]?.type === "text") {
            return parsed.map((p) => p.text).join("");
          }
        }
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  return {
    messagesContainerRef,
    endOfMessagesRef,
    isOverflowing,
    renderMessageContent,
  };
}
