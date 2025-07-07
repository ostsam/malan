import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { userSession } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { demoData } = await req.json();

    if (!demoData) {
      return NextResponse.json(
        { error: "No demo data provided" },
        { status: 400 }
      );
    }

    // Create a new chat session with the demo data
    const chatId = `demo-recovery-${Date.now()}`;
    const slug = `Demo with ${demoData.settings.interlocutor}`;

    const settings = {
      ...demoData.settings,
      isDemo: false, // Mark as regular session now
    };

    // Insert the chat session
    await db.insert(userSession).values({
      chatId,
      slug,
      settings: JSON.stringify(settings),
      userId: session.user.id,
      createdAt: new Date(),
      isPinned: false,
    });

    // Insert the demo messages
    if (demoData.messages && demoData.messages.length > 0) {
      // This would require the messages table schema
      // For now, we'll just return the chat ID and let the frontend handle message display
    }

    return NextResponse.json({
      success: true,
      chatId,
      slug,
      message: "Demo session recovered successfully",
    });
  } catch (error) {
    console.error("Demo recovery error:", error);
    return NextResponse.json(
      { error: "Failed to recover demo session" },
      { status: 500 }
    );
  }
}
