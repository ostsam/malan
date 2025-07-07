"use server";

import { db } from "@/db";
import { userSession, messagesTable } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createChat as createChatInStore,
  ChatSettings,
  generateDescriptiveSlug,
  loadChat,
} from "../tools/chat-store";
import { auth } from "@/app/api/auth/[...all]/auth";
import { headers } from "next/headers";

export async function createChat(settings: ChatSettings) {
  // Awaiting headers() because the TypeScript compiler indicates it's a Promise.
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const chatId = await createChatInStore(settings, userId);
  return chatId;
}

export async function deleteChat(chatId: string) {
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Ensure the user owns the chat before deleting
  await db
    .delete(userSession)
    .where(and(eq(userSession.chatId, chatId), eq(userSession.userId, userId)));
  await db.delete(messagesTable).where(eq(messagesTable.chatId, chatId));
  revalidatePath("/", "layout");
}

export async function updateChatSlug(
  chatId: string,
  newSlug: string
): Promise<string> {
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  if (!newSlug || newSlug.trim().length === 0) {
    throw new Error("Slug cannot be empty");
  }

  await db
    .update(userSession)
    .set({ slug: newSlug.trim() })
    .where(and(eq(userSession.chatId, chatId), eq(userSession.userId, userId)));

  revalidatePath("/", "layout");
  return newSlug.trim();
}

export async function getChat(chatId: string) {
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  if (!chatId || chatId === "undefined") {
    throw new Error("Chat ID is required");
  }

  // Use loadChat to get both chat session and messages
  const chatData = await loadChat(chatId);

  // Verify the user owns this chat
  const chat = await db.query.userSession.findFirst({
    where: and(eq(userSession.chatId, chatId), eq(userSession.userId, userId)),
  });

  if (!chat) {
    throw new Error("Chat not found or user not authorized");
  }

  // Return the full chat data with messages
  return {
    ...chatData,
    createdAt: chatData.createdAt?.toISOString(),
    messages: chatData.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt?.toISOString(),
    })),
  };
}

export async function togglePinStatus(chatId: string) {
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const chat = await db.query.userSession.findFirst({
    where: and(eq(userSession.chatId, chatId), eq(userSession.userId, userId)),
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  await db
    .update(userSession)
    .set({ isPinned: !chat.isPinned })
    .where(eq(userSession.chatId, chatId));

  revalidatePath("/", "layout");
}

export async function generateAndAssignSlug(
  chatId: string,
  firstMessage: string
): Promise<string> {
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const chat = await getChat(chatId);

  if (!chat) {
    throw new Error("Chat not found or user not authorized");
  }

  const settings: ChatSettings = chat.settings as ChatSettings;
  const slug = await generateDescriptiveSlug(
    firstMessage,
    settings.selectedLanguageLabel ?? undefined
  );

  await db
    .update(userSession)
    .set({ slug: slug })
    .where(eq(userSession.chatId, chatId));

  revalidatePath("/", "layout");
  return slug;
}
