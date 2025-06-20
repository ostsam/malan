import { openai } from "@ai-sdk/openai";
import {
  streamText,
  appendResponseMessages,
  createIdGenerator,
  appendClientMessage,
} from "ai";
import {
  loadChat,
  saveChat,
  createChat,
  type ChatSettings,
} from "@/app/tools/chat-store";
import { redirect } from "next/navigation";
import { formatSystemPrompt } from "@/app/lib/prompt-templates";
import { NextRequest } from "next/server";
import OpenAI from "openai"; // Added for TTS

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Initialize OpenAI client for TTS
const ttsOpenai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure OPENAI_API_KEY is in your environment variables
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const settings: ChatSettings = {
    nativeLanguage: searchParams.get("nativeLanguage"),
    selectedLanguage: searchParams.get("selectedLanguage"),
    selectedLanguageLabel: searchParams.get("selectedLanguageLabel"),
    selectedLevel: searchParams.get("selectedLevel"),
    interlocutor: searchParams.get("interlocutor"),
    // name: searchParams.get("userName") ?? "the student", // Default user name if not provided
  };

  const id = await createChat(settings);
  redirect(`/chat/${id}`);
}

export async function POST(req: Request) {
  // Destructure new parameters for audio generation
  const {
    message: userMessage,
    id: chatId,
    generateAudio, // e.g., true
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
    model: openai("o4-mini-2025-04-16"),
    messages: historyWithUserMsg,
    system: systemPrompt,
    temperature: 0.4,
    experimental_generateMessageId: createIdGenerator({
      prefix: "msgs",
      size: 16,
    }),
    // @ts-expect-error: Using experimental Vercel AI SDK feature
    experimental_streamData: true, // Enable data streaming
    // @ts-expect-error: Using experimental Vercel AI SDK feature
    async onFinish({ response, experimental_streamData }) {
      const finalMessagesToSave = appendResponseMessages({
        messages: historyWithUserMsg,
        responseMessages: response.messages,
      });

      await saveChat({
        id: chatId,
        messages: finalMessagesToSave,
      });

      if (generateAudio && experimental_streamData) {
        const assistantMessages = response.messages.filter(
          (m) => m.role === "assistant",
        );
        const lastAssistantMessage =
          assistantMessages[assistantMessages.length - 1];

        let textToSpeak = "";
        if (lastAssistantMessage && lastAssistantMessage.content) {
          if (typeof lastAssistantMessage.content === "string") {
            textToSpeak = lastAssistantMessage.content;
          } else if (Array.isArray(lastAssistantMessage.content)) {
            textToSpeak = lastAssistantMessage.content
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("");
          }
        }

        if (textToSpeak.trim()) {
          try {
            const mp3 = await ttsOpenai.audio.speech.create({
              model: "tts-1",
              voice: voice || "alloy", // Default to "alloy" if no voice is specified
              input: textToSpeak,
              response_format: "mp3",
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            const audioBase64 = buffer.toString("base64");

            experimental_streamData.append({
              type: "audio_data",
              format: "mp3",
              encoding: "base64",
              content: audioBase64,
            });
          } catch (ttsError) {
            console.error("TTS Generation Error:", ttsError);
            experimental_streamData.append({
              type: "audio_error",
              message:
                ttsError instanceof Error
                  ? ttsError.message
                  : "Unknown TTS error",
            });
          }
        }
        // Close the data stream after appending audio data or error
        experimental_streamData.close();
      }
    },
  });

  return result.toDataStreamResponse();
}
