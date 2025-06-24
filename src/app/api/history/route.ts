import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { userSession } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const sessions = await db
    .select({
      id: userSession.chatId,
      slug: userSession.slug,
      createdAt: userSession.createdAt,
    })
    .from(userSession)
    .where(eq(userSession.userId, session.user.id))
    .orderBy(desc(userSession.createdAt));

  console.log("Sessions:", sessions);

  return NextResponse.json({ sessions });
}
