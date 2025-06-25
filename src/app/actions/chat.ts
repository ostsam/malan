'use server';

import { db } from '@/db';
import { userSession, messagesTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createChat as createChatInStore, ChatSettings } from '../tools/chat-store';
import { auth } from '@/app/api/auth/[...all]/auth';
import { headers } from 'next/headers';

export async function createChat(settings: ChatSettings) {
  // Awaiting headers() because the TypeScript compiler indicates it's a Promise.
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const chatId = await createChatInStore(settings, userId);
  return chatId;
}

export async function deleteChat(chatId: string) {
  // TODO: Add authentication
  await db.delete(userSession).where(eq(userSession.chatId, chatId));
  await db.delete(messagesTable).where(eq(messagesTable.chatId, chatId));
  revalidatePath('/', 'layout');
}
