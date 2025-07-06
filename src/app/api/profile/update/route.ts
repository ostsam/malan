import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { validateProfileUpdate } from "@/lib/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Profile update request received");

    // Debug: Log all cookies
    const allCookies = request.headers.get("cookie");
    console.log("🍪 All cookies:", allCookies);

    // Try to get session with original headers first
    let session = await auth.api.getSession({ headers: request.headers });
    console.log(
      "👤 Session result (original):",
      session ? "Found" : "Not found"
    );

    if (!session?.user?.id) {
      console.log("❌ No session found, trying alternative approach");

      // Parse cookies manually
      const cookies =
        allCookies?.split(";").reduce(
          (acc, cookie) => {
            const [name, value] = cookie.trim().split("=");
            if (name && value) {
              acc[name] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        ) || {};

      console.log("🍪 Parsed cookies:", Object.keys(cookies));

      // Try Better Auth specific cookie names
      const sessionCookieNames = [
        "__Secure-better-auth.session_data",
        "__Secure-better-auth.session_token",
        "better-auth.session_data",
        "better-auth.session_token",
        "better-auth.session-token",
        "session-token",
        "auth-session",
        "session",
        ...Object.keys(cookies).filter(
          (name) => name.includes("session") || name.includes("auth")
        ),
      ];

      for (const cookieName of sessionCookieNames) {
        if (cookies[cookieName]) {
          console.log(`🔍 Trying session cookie: ${cookieName}`);
          const testHeaders = new Headers();
          testHeaders.set("cookie", `${cookieName}=${cookies[cookieName]}`);

          try {
            session = await auth.api.getSession({ headers: testHeaders });
            if (session?.user?.id) {
              console.log(`✅ Found session with cookie: ${cookieName}`);
              break;
            }
          } catch (error) {
            console.log(`❌ Failed with cookie: ${cookieName}`, error);
          }
        }
      }
    }

    if (!session?.user?.id) {
      console.log("❌ No session or user ID found after all attempts");
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", session.user.id);

    // Validate request data
    const rawData = await request.json();
    const validatedData = validateProfileUpdate(rawData);
    const { name } = validatedData;

    console.log("📝 Updating name to:", name);

    // Update user profile via Better Auth with session headers
    await auth.api.updateUser({
      body: { name },
      headers: request.headers,
    });

    console.log("✅ Profile updated successfully");

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Profile update error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
