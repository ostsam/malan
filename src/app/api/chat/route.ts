import { openai } from "@ai-sdk/openai";
import {
  streamText,
  appendResponseMessages,
  createIdGenerator,
  appendClientMessage,
} from "ai";
import { loadChat, saveChat, createChat, type ChatSettings } from "@/app/tools/chat-store";
import { redirect } from "next/navigation";
import { formatSystemPrompt } from "@/app/lib/prompt-templates";
import { NextRequest } from "next/server";



// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const settings: ChatSettings = {
    nativeLanguage: searchParams.get("nativeLanguage") || undefined,
    selectedLanguage: searchParams.get("selectedLanguage") || undefined,
    selectedLevel: searchParams.get("selectedLevel") ?? undefined,
    interlocutor: searchParams.get("interlocutor") ?? undefined,
    name: searchParams.get("userName") ?? "the student", // Default user name if not provided
  };

  const id = await createChat(settings);
  redirect(`/chat/${id}`);
}

export async function POST(req: Request) {
  const { message: userMessage, id: chatId } = await req.json();

  const { settings, messages: previousMessages } = await loadChat(chatId);

  const systemPrompt = formatSystemPrompt(settings);
  
  // Message history
  const historyWithUserMsg = appendClientMessage({
    messages: previousMessages, 
    message: userMessage, //current message from user
  });

  console.log(systemPrompt)
  const result = streamText({
    model: openai("o4-mini-2025-04-16"),
    messages: historyWithUserMsg, 
    system: systemPrompt,
    experimental_generateMessageId: createIdGenerator({
      prefix: "msgs",
      size: 16,
    }),
    async onFinish({ response }) {
      const finalMessagesToSave = appendResponseMessages({
        messages: historyWithUserMsg,
        responseMessages: response.messages,
      });

      await saveChat({
        id: chatId,
        messages: finalMessagesToSave,
      });
    },
  });

  return result.toDataStreamResponse();
}
