import { generateId } from "ai";
import { Message } from "ai";
import { db } from "@/db";
import { userSession, messagesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
}

export async function createChat(settings: ChatSettings): Promise<string> {
  const chatId = generateId();
  await db.insert(userSession).values({
    chatId: chatId,
    settings: settings,
  });
  return chatId;
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
    role: record.role as Message['role'],
    createdAt: record.createdAt || undefined,
    content: record.content!,
    parts: record.parts as any,
  }));

  return { settings, messages };
}

export async function saveChat({
  id,
  messages,
}: {
  id: string;
  messages: Message[];
}): Promise<void> {
  //   Delete existing messages for the chat session
  await db.delete(messagesTable).where(eq(messagesTable.chatId, id));

  // Insert the new set of messages
  if (messages.length > 0) {
    const messagesToInsert = messages.map((msg) => ({
      messageId: msg.id,
      chatId: id,
      role: msg.role,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt ? new Date(msg.createdAt) : new Date()),
      parts: msg.parts || [],
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
    await db.insert(messagesTable).values(messagesToInsert);
  }
}
