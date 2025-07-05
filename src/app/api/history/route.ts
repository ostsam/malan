import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { userSession, messagesTable } from "@/db/schema";
import { sql, desc, eq, and, notInArray } from "drizzle-orm";
import { auth } from "@/app/api/auth/[...all]/auth";

interface UserSessionSettings {
  selectedLanguageLabel: string;
  selectedLevel: string;
  interlocutor: string;
  nativeLanguage: string;
  selectedLanguage: string;
  nativeLanguageLabel: string;
}

// Cache for 30 seconds instead of 60 to improve freshness
export const revalidate = 30;

export async function GET(request: NextRequest) {
  const a = await auth.api.getSession({ headers: request.headers });
  if (!a?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // OPTIMIZATION: Use a single query with window functions instead of multiple queries
  const sessionsWithLastMessage = await db
    .select({
      chatId: userSession.chatId,
      slug: userSession.slug,
      createdAt: userSession.createdAt,
      userId: userSession.userId,
      isPinned: userSession.isPinned,
      settings: userSession.settings,
      lastMessageAt: sql<string>`
        (SELECT MAX(${messagesTable.createdAt}) 
         FROM ${messagesTable} 
         WHERE ${messagesTable.chatId} = ${userSession.chatId})
      `.as("lastMessageAt"),
    })
    .from(userSession)
    .where(eq(userSession.userId, a.user.id))
    .orderBy(
      desc(userSession.isPinned),
      desc(sql`lastMessageAt`),
      desc(userSession.createdAt)
    );

  // OPTIMIZATION: Clean up orphaned sessions in background (don't block response)
  setImmediate(async () => {
    try {
      const chatsWithMessagesSubquery = db
        .selectDistinct({ chatId: messagesTable.chatId })
        .from(messagesTable);

      await db
        .delete(userSession)
        .where(
          and(
            eq(userSession.userId, a.user.id),
            notInArray(userSession.chatId, chatsWithMessagesSubquery)
          )
        );
    } catch (error) {
      console.error("Background cleanup failed:", error);
    }
  });

  const response = {
    sessions: sessionsWithLastMessage.map((session) => {
      const { settings, ...rest } = session;
      const userSettings: UserSessionSettings = settings as UserSessionSettings;
      return {
        ...rest,
        interlocutor: userSettings.interlocutor,
        selectedLevel: userSettings.selectedLevel,
        nativeLanguage: userSettings.nativeLanguage,
        selectedLanguage: userSettings.selectedLanguage,
        nativeLanguageLabel: userSettings.nativeLanguageLabel,
        selectedLanguageLabel: userSettings.selectedLanguageLabel,
      };
    }),
  };

  // Add ETag for caching
  const etag = `"${Buffer.from(JSON.stringify(response)).toString("base64").slice(0, 8)}"`;

  return NextResponse.json(response, {
    headers: {
      ETag: etag,
      "Cache-Control": "private, max-age=30",
    },
  });
}
