import { generateId } from "ai";
import { Message } from "ai";
import { db } from "@/db"; // Assuming your db instance is exported from @/db/index.ts
import { userSession, messagesTable } from "@/db/schema"; // Assuming your schema is in @/db/schema.ts
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
  const id = generateId();
  await db.insert(userSession).values({
    chatId: id,
    settings: settings,
    // userId can be added here if available, e.g., from auth context
  });
  return id;
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
    .orderBy(messagesTable.createdAt); // Assuming you want messages ordered by creation time

  // The 'parts' and 'content' in messagesTable might need specific mapping to AI SDK's Message type
  // For now, assuming a direct mapping or that the structure is compatible.
  // The AI SDK Message type has: id, role, content, and optional: toolInvocations, toolResponses, parts, createdAt, ...
  // Our messagesTable has: messageId, chatId, role, createdAt, parts, content.
  const messages: Message[] = messageRecords.map((record) => ({
    id: record.messageId!,
    chatId: record.chatId!,
    role: record.role as Message['role'], // Cast if necessary, e.g. 'user' | 'assistant' | 'system' | 'tool'
    createdAt: record.createdAt || undefined,
    // parts: record.parts, // This needs to be compatible with Message['parts']
    content: record.content!,
    // Ensure 'parts' from DB is correctly transformed if it's not directly assignable
    // For example, if record.parts is a simple JSON and Message['parts'] is more complex:
    parts: record.parts as any, // This is a placeholder, adjust based on actual types
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
  // Delete existing messages for the chat session
  await db.delete(messagesTable).where(eq(messagesTable.chatId, id));

  // Insert the new set of messages
  if (messages.length > 0) {
    const messagesToInsert = messages.map((msg) => ({
      messageId: msg.id,
      chatId: id, // msg.chatId should also be 'id'
      role: msg.role,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt ? new Date(msg.createdAt) : new Date()), // Ensure createdAt is a Date object
      parts: msg.parts || [], // Ensure parts is not null, provide default if necessary
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content), // Ensure content is string
    }));
    await db.insert(messagesTable).values(messagesToInsert);
  }
}
