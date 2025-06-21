import { generateId } from "ai";
import { Message } from "ai";
import { db } from "@/db";
import { userSession, messagesTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ChatSettings {
  nativeLanguage: string | null;
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
}

export interface ChatMetadata {
  id: string;
  createdAt: Date;
  settings: ChatSettings;
}

export async function createChat(
  settings: ChatSettings,
  userId: string
): Promise<string> {
  const chatId = generateId();
  await db.insert(userSession).values({
    chatId: chatId,
    settings: settings,
    userId: userId,
  });
  return chatId;
}

export async function loadUserChatHistory(
  userId: string
): Promise<ChatMetadata[]> {
  const sessionRecords = await db
    .select({
      id: userSession.chatId,
      createdAt: userSession.createdAt,
      settings: userSession.settings,
    })
    .from(userSession)
    .where(eq(userSession.userId, userId))
    .orderBy(desc(userSession.createdAt));

  return sessionRecords.map((session) => ({
    id: session.id,
    createdAt: session.createdAt ?? new Date(),
    settings: session.settings as ChatSettings,
  }));
}

export async function loadChat(id: string): Promise<ChatData> {
  const sessionResult = await db
    .select()
    .from(userSession)
    .where(eq(userSession.chatId, id))
    .limit(1);

  if (sessionResult.length === 0) {
    throw new Error(`Chat session with id ${id} not found.`);
  }

  const settings = sessionResult[0].settings as ChatSettings;

  const messageRecords = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(messagesTable.createdAt);

  const messages: Message[] = messageRecords.map((record) => ({
    id: record.messageId!,
    chatId: record.chatId!,
    role: record.role as Message["role"],
    createdAt: record.createdAt || undefined,
    content: record.content!,
    parts: record.parts as any,
  }));

  return { settings, messages };
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

  const messagesToInsert = newMessages.map((msg) => ({
    messageId: msg.id,
    chatId: id,
    role: msg.role,
    createdAt:
      msg.createdAt instanceof Date
        ? msg.createdAt
        : msg.createdAt
        ? new Date(msg.createdAt)
        : new Date(),
    parts: msg.parts || [], // Ensure parts is an array, even if undefined in msg
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
  }));

  // Insert only the new messages
  await db.insert(messagesTable).values(messagesToInsert);
}
