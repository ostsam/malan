import { generateId } from "ai";
import { Message } from "ai";
import { db } from "@/db";
import { userSession, messagesTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

export interface ChatSettings {
  nativeLanguage: string | null;
  nativeLanguageLabel: string | null;
  selectedLanguage: string | null;
  selectedLanguageLabel: string | null;
  selectedLevel: string | null;
  interlocutor: string | null;
  name?: string | null;
}

export interface ChatData {
  settings: ChatSettings;
  messages: Message[];
  id?: string;
  createdAt?: Date;
  slug?: string;
}

export interface ChatMetadata {
  id: string;
  slug: string;
  createdAt: Date;
  settings: ChatSettings;
}

export async function generateDescriptiveSlug(
  firstMessage: string,
  selectedLanguageLabel?: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Generate a sentence in ${selectedLanguageLabel} explaining the topic of this message: "${firstMessage}" in order to summarize this conversation. ONLY WRITE IN ${selectedLanguageLabel}!.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 8,
    temperature: 0.2,
  });

  return response.choices[0].message.content?.trim() || "";
}

export async function createChat(
  settings: Partial<ChatSettings>,
  userId: string
): Promise<string> {
  const chatId = generateId();
  const finalSettings = parseChatSettings(settings);

  const slug = "New Chat";

  await db.insert(userSession).values({
    chatId: chatId,
    userId: userId,
    slug: slug,
    settings: JSON.stringify(finalSettings),
    createdAt: new Date(),
  });

  return chatId;
}

export async function loadUserChatHistory(
  userId: string
): Promise<ChatMetadata[]> {
  const sessionRecords = await db
    .select({
      id: userSession.chatId,
      slug: userSession.slug,
      createdAt: userSession.createdAt,
      settings: userSession.settings,
    })
    .from(userSession)
    .where(eq(userSession.userId, userId))
    .orderBy(desc(userSession.createdAt));

  return sessionRecords.map((session) => ({
    id: session.id,
    slug: session.slug,
    createdAt: session.createdAt ?? new Date(),
    settings: parseChatSettings(
      session.settings as Partial<ChatSettings> | null
    ),
  }));
}

export async function loadChat(id: string): Promise<ChatData> {
  if (!id || id === "undefined") {
    throw new Error("Chat ID is required");
  }

  // OPTIMIZATION: Use a single query with proper ordering
  const sessionResult = await db
    .select()
    .from(userSession)
    .where(eq(userSession.chatId, id))
    .limit(1);

  if (sessionResult.length === 0) {
    throw new Error(`Chat session with id ${id} not found.`);
  }

  const settings = parseChatSettings(
    sessionResult[0].settings as Partial<ChatSettings> | null
  );
  const slug = sessionResult[0].slug;

  // OPTIMIZATION: Use the new index for efficient message loading
  const messageRecords = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(messagesTable.createdAt, messagesTable.messageId); // Add messageId as secondary sort for exact ordering

  const messages: Message[] = messageRecords.map((record) => ({
    id: record.messageId!,
    chatId: record.chatId!,
    role: record.role as Message["role"],
    createdAt: record.createdAt || new Date(), // Provide a fallback timestamp
    content: record.content!,
    parts: record.parts as Message["parts"],
  }));

  return {
    settings,
    messages,
    id,
    slug,
    createdAt: sessionResult[0].createdAt,
  };
}

export async function appendNewMessages({
  id,
  newMessages,
}: {
  id: string;
  newMessages: Message[];
}): Promise<void> {
  if (newMessages.length === 0) {
    return;
  }

  const existingMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id));

  const messagesToInsert = newMessages.map((msg, index) => ({
    messageId: msg.id,
    chatId: id,
    role: msg.role,
    createdAt:
      msg.createdAt instanceof Date
        ? msg.createdAt
        : msg.createdAt
          ? new Date(msg.createdAt)
          : new Date(Date.now() + index * 100), // Add 100ms spacing to prevent exact same timestamp
    parts: msg.parts || [], // Ensure parts is an array, even if undefined in msg
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
  }));

  // Insert only the new messages
  await db.insert(messagesTable).values(messagesToInsert);

  // OPTIMIZATION: Update lastMessageAt in userSession when new messages are added
  const latestMessageTime = newMessages.reduce((latest, msg) => {
    const msgTime =
      msg.createdAt instanceof Date
        ? msg.createdAt
        : new Date(msg.createdAt || Date.now());
    return msgTime > latest ? msgTime : latest;
  }, new Date(0));

  await db
    .update(userSession)
    .set({ lastMessageAt: latestMessageTime })
    .where(eq(userSession.chatId, id));

  if (existingMessages.length === 0) {
    const firstUserMessage = newMessages.find((msg) => msg.role === "user");
    if (firstUserMessage) {
      const sessionResult = await db
        .select({ settings: userSession.settings })
        .from(userSession)
        .where(eq(userSession.chatId, id))
        .limit(1);

      if (sessionResult.length === 0) return;

      const settings = parseChatSettings(
        sessionResult[0].settings as Partial<ChatSettings> | null
      );

      const descriptiveSlug = await generateDescriptiveSlug(
        firstUserMessage.content as string,
        settings.selectedLanguageLabel ?? undefined
      );

      await db
        .update(userSession)
        .set({ slug: descriptiveSlug })
        .where(eq(userSession.chatId, id));
    }
  }
}

function parseChatSettings(
  settings: string | Partial<ChatSettings> | null | undefined
): ChatSettings {
  const defaults: ChatSettings = {
    nativeLanguage: "en",
    nativeLanguageLabel: "English",
    selectedLanguage: "es",
    selectedLanguageLabel: "Español / Spanish",
    selectedLevel: "Beginner",
    interlocutor: "Mateo",
    name: "New Chat",
  };

  let parsed: Partial<ChatSettings> = {};
  if (typeof settings === "string") {
    try {
      const parsedJson = JSON.parse(settings);
      if (typeof parsedJson === "object" && parsedJson !== null) {
        parsed = parsedJson;
      }
    } catch {
      // Fallback to empty object on parse error
      parsed = {};
    }
  } else if (settings) {
    parsed = settings;
  }

  // Filter out null/undefined values from parsed settings so they don't overwrite defaults
  const cleanParsed: Partial<ChatSettings> = {};
  for (const key in parsed) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      const value = parsed[key as keyof typeof parsed];
      if (value !== null && value !== undefined) {
        (cleanParsed as Partial<ChatSettings>)[key as keyof ChatSettings] =
          value;
      }
    }
  }

  return {
    ...defaults,
    ...cleanParsed,
  };
}
