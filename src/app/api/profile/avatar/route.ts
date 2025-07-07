import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Avatar upload request received");

    // Get session
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", session.user.id);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file type. Please upload JPG, PNG, GIF, or WebP",
        },
        { status: 400 }
      );
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user avatar in database
    await db
      .update(user)
      .set({
        image: dataUrl,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    console.log("✅ Avatar updated successfully");

    return NextResponse.json({
      success: true,
      message: "Avatar updated successfully",
      avatarUrl: dataUrl,
    });
  } catch (error: unknown) {
    console.error("❌ Avatar upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload avatar";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("🔍 Avatar delete request received");

    // Get session
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", session.user.id);

    // Remove avatar from database
    await db
      .update(user)
      .set({
        image: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    console.log("✅ Avatar deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Avatar removed successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Avatar delete error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete avatar";
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
