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

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const a = await auth.api.getSession({ headers: request.headers });
  if (!a?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ifNoneMatch = request.headers.get("if-none-match");

  // Delete user sessions that have no messages.
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

  // Now, fetch the remaining sessions and sort them.
  const latestMessages = db
    .select({
      chatId: messagesTable.chatId,
      lastMessageAt: sql<string>`MAX(${messagesTable.createdAt})`.as(
        "lastMessageAt"
      ),
    })
    .from(messagesTable)
    .groupBy(messagesTable.chatId)
    .as("latestMessages");

  const sessions = await db
    .select({
      chatId: userSession.chatId,
      slug: userSession.slug,
      createdAt: userSession.createdAt,
      userId: userSession.userId,
      isPinned: userSession.isPinned,
      lastMessageAt: latestMessages.lastMessageAt,
      settings: userSession.settings,
    })
    .from(userSession)
    .leftJoin(latestMessages, eq(userSession.chatId, latestMessages.chatId))
    .where(eq(userSession.userId, a.user.id))
    .orderBy(desc(userSession.isPinned), desc(latestMessages.lastMessageAt));

  // Determine ETag based on last update timestamp
  const lastUpdated =
    sessions[0]?.lastMessageAt ?? sessions[0]?.createdAt ?? "0";
  const etag = `W/\"${lastUpdated}\"`;

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  return NextResponse.json(
    {
      sessions: sessions.map((session) => {
        const { settings, ...rest } = session;
        const userSettings: UserSessionSettings =
          settings as UserSessionSettings;
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
    },
    {
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    }
  );
}
