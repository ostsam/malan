'use server';

import { db } from '@/db';
import { userSession, messagesTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function deleteChat(chatId: string) {
  // TODO: Add authentication
  await db.delete(userSession).where(eq(userSession.chatId, chatId));
  await db.delete(messagesTable).where(eq(messagesTable.chatId, chatId));
  revalidatePath('/', 'layout');
}
