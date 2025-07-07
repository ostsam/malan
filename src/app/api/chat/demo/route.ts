import { openai } from "@ai-sdk/openai";
import { streamText, createIdGenerator, appendClientMessage } from "ai";
import { formatSystemPrompt } from "@/app/lib/prompt-templates";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Demo chat API received:", JSON.stringify(body, null, 2));

    // Support both {message, settings} and {messages, settings} formats
    let userMessage = body.message;
    let messages = body.messages || [];
    const settings = body.settings;

    // If no message field, check if it's in the messages array
    if (!userMessage && Array.isArray(messages) && messages.length > 0) {
      userMessage = messages[messages.length - 1];
      messages = messages.slice(0, -1); // Remove the last message from history
    }

    if (!userMessage) {
      console.log("No userMessage found in request");
      return new Response("Message required", { status: 400 });
    }

    if (!settings) {
      console.log("No settings found in request");
      return new Response("Settings required", { status: 400 });
    }

    const systemPrompt = formatSystemPrompt(settings);

    // Ensure userMessage has an id
    const messageWithId = {
      ...userMessage,
      id:
        userMessage.id ||
        `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Message history
    const historyWithUserMsg = appendClientMessage({
      messages,
      message: messageWithId,
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
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Demo chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
