import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateChatSlug, getChat } from "@/app/actions/chat";
import { generateAndAssignSlug } from "@/app/actions/chat";

export function useChatSlug(
  initialSlug: string | undefined,
  id: string | undefined
) {
  const [slug, setSlug] = useState(initialSlug || "New Chat");
  const router = useRouter();

  useEffect(() => {
    if (id) {
      getChat(id).then((chat) => {
        if (chat?.slug) {
          setSlug(chat.slug);
        }
      });
    }
  }, [id]);

  const handleSlugUpdate = async (newSlug: string) => {
    if (id && newSlug) {
      const updatedSlug = await updateChatSlug(id, newSlug);
      setSlug(updatedSlug);
      router.refresh();
    }
  };

  const generateSlugFromMessage = async (messageContent: string) => {
    if (slug === "New Chat" && id) {
      try {
        const newSlug = await generateAndAssignSlug(id, messageContent);
        setSlug(newSlug);
        router.refresh();
      } catch (error) {
        console.error("Failed to generate or assign slug:", error);
      }
    }
  };

  return {
    slug,
    setSlug,
    handleSlugUpdate,
    generateSlugFromMessage,
  };
}
