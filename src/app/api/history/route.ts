import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { userSession, messagesTable } from "@/db/schema";
import { eq, desc, and, notInArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

interface UserSessionSettings {
  selectedLanguageLabel: string;
  selectedLevel: string;
  interlocutor: string;
  nativeLanguage: string;
  selectedLanguage: string;
  nativeLanguageLabel: string;
}

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const a = await auth.api.getSession({ headers: request.headers });
  if (!a?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // OPTIMIZATION: Use the materialized lastMessageAt column instead of expensive joins
  const sessions = await db
    .select({
      chatId: userSession.chatId,
      slug: userSession.slug,
      createdAt: userSession.createdAt,
      userId: userSession.userId,
      isPinned: userSession.isPinned,
      lastMessageAt: userSession.lastMessageAt,
      settings: userSession.settings,
    })
    .from(userSession)
    .where(eq(userSession.userId, a.user.id))
    .orderBy(
      desc(userSession.isPinned),
      desc(userSession.lastMessageAt),
      desc(userSession.createdAt)
    );

  // OPTIMIZATION: Remove session cleanup from every request - this should be a background job
  // The cleanup logic has been moved to a separate background process to avoid blocking the API

  const response = NextResponse.json({
    sessions: sessions.map((session) => {
      const { settings, ...rest } = session;
      const userSettings: UserSessionSettings = settings as UserSessionSettings;
      return {
        ...rest,
        chatId: session.chatId,
        interlocutor: userSettings.interlocutor,
        selectedLevel: userSettings.selectedLevel,
        nativeLanguage: userSettings.nativeLanguage,
        selectedLanguage: userSettings.selectedLanguage,
        nativeLanguageLabel: userSettings.nativeLanguageLabel,
        selectedLanguageLabel: userSettings.selectedLanguageLabel,
      };
    }),
  });

  // Add caching headers for better performance
  response.headers.set(
    "Cache-Control",
    "private, max-age=30, stale-while-revalidate=60"
  );

  return response;
}
