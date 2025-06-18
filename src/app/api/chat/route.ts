import { openai } from "@ai-sdk/openai";
import {
  streamText,
  appendResponseMessages,
  createIdGenerator,
  appendClientMessage,
} from "ai";
import { loadChat, saveChat, createChat } from "@/app/tools/chat-store";
import { redirect } from "next/navigation";

const prompt =
  "You are ${interlocutor}, a ${selectedLanguage} tutor with many decades of experience and a penchant for teaching your students in a memorable way, they leave your sessions truly having learned a lot of ${selectedLanguage} as used by contemporary native speakers. Your current student is ${name} and they speak ${nativeLanguage} natively. They report that they speak ${selectedLanguage} at a ${selectedLevel} level. Seeing as this is your first conversation, first gauge their level of ${selectedLanguage}. Start by making small talk about who they are and their interests and depending on their grammar, knowledge of vocabulary, and pronunciation, either raise the complexity of your conversation or keep it at the same level. Ask them about their interests, daily life, and encourage them to express themselves fully. You are very easygoing and easy to talk to in a way that allows students to open up without feeling like they will be castigated for making a mistake. Have asides where you introduce new vocabulary that you believe your student would benefit from learning given the context of the conversation. If they struggle, help them find the right words and gently correct errors. You can explain grammar when relevant, but focus more on keeping the conversation flowing naturally while providing support. Always check for understanding. If ${name} struggles to understand the concept when you try to explain it to them, briefly switch over to ${nativeLanguage}. Show interest in their responses and ask follow-up questions.";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET() {
  const id = await createChat();
  redirect(`/chat/${id}`);
}

export async function POST(req: Request) {
  const { message: userMessage, id: chatId } = await req.json();

  const capturedUserRole = userMessage.role;
  const previousMessages = await loadChat(chatId);

  // Message history
  const historyWithUserMsg = appendClientMessage({
    messages: previousMessages,
    message: userMessage, // the current message from the client
  });

  const result = await streamText({
    model: openai("o4-mini-2025-04-16"),
    messages: historyWithUserMsg, // Pass the history including the user's message to the AI
    system: prompt,
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
        role: capturedUserRole,
      });
    },
  });

  return result.toDataStreamResponse();
}
