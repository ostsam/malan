import { NextResponse } from "next/server";
import { loadUserChatHistory } from "@/app/tools/chat-store";
import { auth } from "@/app/api/auth/[...all]/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const chats = await loadUserChatHistory(session.user.id);
  return NextResponse.json({ chats });
}
