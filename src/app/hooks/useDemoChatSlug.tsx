import { useState, useEffect } from "react";

export function useDemoChatSlug(
  initialSlug: string | undefined,
  id: string | undefined
) {
  const [slug, setSlug] = useState(initialSlug || "New Chat");

  const handleSlugUpdate = async (newSlug: string) => {
    if (newSlug) {
      setSlug(newSlug);
    }
  };

  const generateSlugFromMessage = async (messageContent: string) => {
    if (slug === "New Chat") {
      // For demo, just use a simple slug based on the first few words
      const words = messageContent.split(" ").slice(0, 3).join(" ");
      const newSlug = words.length > 0 ? words : "New Chat";
      setSlug(newSlug);
    }
  };

  return {
    slug,
    setSlug,
    handleSlugUpdate,
    generateSlugFromMessage,
  };
}
