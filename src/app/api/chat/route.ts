import { openai } from "@ai-sdk/openai";
import {
  streamText,
  appendResponseMessages,
  createIdGenerator,
  appendClientMessage,
  type Message,
} from "ai";
import {
  loadChat,
  appendNewMessages,
  createChat,
  type ChatSettings,
} from "@/app/tools/chat-store";
import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/[...all]/auth";

import { formatSystemPrompt } from "@/app/lib/prompt-templates";
import { NextRequest } from "next/server";
import { updateUserStreak } from "@/lib/streak-utils";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const searchParams = req.nextUrl.searchParams;
  const settings: ChatSettings = {
    nativeLanguage: searchParams.get("nativeLanguage"),
    nativeLanguageLabel: searchParams.get("nativeLanguageLabel"),
    selectedLanguage: searchParams.get("selectedLanguage"),
    selectedLanguageLabel: searchParams.get("selectedLanguageLabel"),
    selectedLevel: searchParams.get("selectedLevel"),
    interlocutor: searchParams.get("interlocutor"),
  };

  const id = await createChat(settings, userId);
  redirect(`/chat/${id}`);
}

export async function POST(req: Request) {
  try {
    // Parse request data - AI SDK sends messages in a different format
    const rawData = await req.json();

    // Extract the message content from the AI SDK format
    let userMessage: string;
    let chatId: string | undefined;

    if (
      rawData.messages &&
      Array.isArray(rawData.messages) &&
      rawData.messages.length > 0
    ) {
      // AI SDK format: { messages: [{ role: "user", content: "..." }] }
      const lastMessage = rawData.messages[rawData.messages.length - 1];
      userMessage = lastMessage.content;
      chatId = rawData.id;
    } else if (rawData.message) {
      // Direct message format: { message: "...", id: "..." }
      userMessage = rawData.message;
      chatId = rawData.id;
    } else {
      throw new Error("Invalid message format");
    }

    // Validate the extracted message
    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim().length === 0
    ) {
      throw new Error("Message cannot be empty");
    }

    if (userMessage.length > 2000) {
      throw new Error("Message too long");
    }

    // Get user session for streak updates
    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id;

    if (!chatId) {
      return new Response(JSON.stringify({ error: "Chat ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

  const { settings, messages } = await loadChat(chatId);

  const systemPrompt = formatSystemPrompt(settings);

  // Message history
    const userMessageObj = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user" as const,
      content: userMessage,
    };
  const historyWithUserMsg = appendClientMessage({
    messages,
      message: userMessageObj, // now a Message object
  });

  const result = streamText({
    model: openai("gpt-4.1-nano"),
    messages: historyWithUserMsg,
    system: systemPrompt,
    temperature: 0.4,
    experimental_generateMessageId: createIdGenerator({
      prefix: "msgs",
      size: 16,
    }),
    async onFinish({ response }) {
        const newAssistantMessages = response.messages
          .filter((msg) =>
        historyWithUserMsg.every((hMsg) => hMsg.id !== msg.id)
          )
          .map((msg) => {
            // If content is not a string, try to join text parts
            if (typeof msg.content === "string") {
              return msg;
            } else if (Array.isArray(msg.content)) {
              // Only join text from parts that have a 'text' property
              const text = msg.content
                .map((part) =>
                  typeof part === "object" &&
                  "text" in part &&
                  typeof part.text === "string"
                    ? part.text
                    : ""
                )
                .join("");
              return { ...msg, content: text };
            } else {
              // Fallback: stringify or use placeholder
              return { ...msg, content: "[Unsupported content]" };
            }
          });

      const messagesToSaveThisTurn = [
          ...(userMessage ? [userMessageObj] : []),
        ...newAssistantMessages,
        ]
          .filter(
            (msg) =>
              (msg.role === "user" || msg.role === "assistant") &&
              typeof msg.content === "string" &&
              typeof msg.id === "string"
          )
          .map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content as string,
          })) as Message[];

      if (messagesToSaveThisTurn.length > 0) {
        await appendNewMessages({
          id: chatId,
          newMessages: messagesToSaveThisTurn,
        });
      }

        // Update streak when user sends a message
        if (userId && userMessage) {
          await updateUserStreak(userId);
        }
    },
  });

  return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Invalid request data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
