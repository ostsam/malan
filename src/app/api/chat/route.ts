import { openai } from "@ai-sdk/openai";
import {
  streamText,
  appendResponseMessages,
  createIdGenerator,
  appendClientMessage,
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
import OpenAI from "openai"; // Added for TTS

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;


const ttsOpenai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

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
    selectedLanguage: searchParams.get("selectedLanguage"),
    selectedLanguageLabel: searchParams.get("selectedLanguageLabel"),
    selectedLevel: searchParams.get("selectedLevel"),
    interlocutor: searchParams.get("interlocutor"),
  };

  const id = await createChat(settings, userId);
  redirect(`/chat/${id}`);
}

export async function POST(req: Request) {
  // Destructure new parameters for audio generation
  const {
    message: userMessage,
    id: chatId,
    voice, // e.g., "alloy", "nova"
  } = await req.json();

  const { settings, messages } = await loadChat(chatId);

  const systemPrompt = formatSystemPrompt(settings);

  // Message history
  const historyWithUserMsg = appendClientMessage({
    messages,
    message: userMessage, //current message from user
  });

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    messages: historyWithUserMsg,
    system: systemPrompt,
    temperature: 0.4,
    experimental_generateMessageId: createIdGenerator({
      prefix: "msgs",
      size: 16,
    }),
    async onFinish({ response }) {
      const newAssistantMessages = response.messages.filter(
        (msg) => historyWithUserMsg.every(hMsg => hMsg.id !== msg.id)
      );

      const messagesToSaveThisTurn = [
        ...(userMessage ? [userMessage] : []),
        ...newAssistantMessages
      ];
      
      if (messagesToSaveThisTurn.length > 0) {
        await appendNewMessages({
          id: chatId,
          newMessages: messagesToSaveThisTurn,
        });
      }
    },
  });

  return result.toDataStreamResponse();
}
