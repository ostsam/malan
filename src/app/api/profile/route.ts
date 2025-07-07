import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Profile fetch request received");

    // Get session
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", session.user.id);

    return NextResponse.json({
      success: true,
      profile: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });
  } catch (error) {
    console.error("❌ Profile fetch error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
