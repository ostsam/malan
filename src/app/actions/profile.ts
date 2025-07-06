"use server";

import { auth } from "@/app/api/auth/[...all]/auth";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  validateProfileUpdate,
  validatePreferences,
  validatePasswordChange,
} from "@/lib/validation-schemas";

export interface ProfileData {
  name: string;
  email: string;
}

export interface PreferencesData {
  nativeLanguage?: string;
  targetLanguage?: string;
  dailyGoal?: number;
  ttsVoice?: string;
  emailNotifications?: boolean;
}

// Helper function to get session with proper Better Auth cookie handling
async function getSessionWithCookies() {
  try {
    // Better Auth stores session data in a specific cookie format
    // Let's try to get the session directly from the auth instance
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    console.log(
      "🍪 All cookies in server action:",
      allCookies.map((c) => c.name)
    );

    // Better Auth uses a specific cookie format - let's try the secure cookie
    const sessionDataCookie = cookieStore.get(
      "__Secure-better-auth.session_data"
    );
    const sessionTokenCookie = cookieStore.get(
      "__Secure-better-auth.session_token"
    );

    console.log("🍪 Session data cookie found:", !!sessionDataCookie);
    console.log("🍪 Session token cookie found:", !!sessionTokenCookie);

    if (!sessionDataCookie?.value && !sessionTokenCookie?.value) {
      console.log("❌ No session cookies found");
      return null;
    }

    // Create headers with all session-related cookies
    const headers = new Headers();

    // Add all session-related cookies
    if (sessionDataCookie?.value) {
      headers.append(
        "cookie",
        `__Secure-better-auth.session_data=${sessionDataCookie.value}`
      );
    }
    if (sessionTokenCookie?.value) {
      headers.append(
        "cookie",
        `__Secure-better-auth.session_token=${sessionTokenCookie.value}`
      );
    }

    // Also try the non-secure version
    const nonSecureDataCookie = cookieStore.get("better-auth.session_data");
    const nonSecureTokenCookie = cookieStore.get("better-auth.session_token");

    if (nonSecureDataCookie?.value) {
      headers.append(
        "cookie",
        `better-auth.session_data=${nonSecureDataCookie.value}`
      );
    }
    if (nonSecureTokenCookie?.value) {
      headers.append(
        "cookie",
        `better-auth.session_token=${nonSecureTokenCookie.value}`
      );
    }

    // Try to get session with the cookies
    const session = await auth.api.getSession({ headers });
    if (session?.user?.id) {
      console.log("✅ Session found:", session.user.id);
      return session;
    }

    console.log("❌ Failed to get session with cookies");
    return null;
  } catch (error) {
    console.log("❌ Error getting session:", error);
    return null;
  }
}

export async function updateProfile(data: ProfileData) {
  try {
    console.log("🔍 Server action: updateProfile called");

    // Validate input data
    const validatedData = validateProfileUpdate(data);

    const session = await getSessionWithCookies();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    console.log("✅ User authenticated:", session.user.id);

    // Get the cookies again to pass to updateUser
    const cookieStore = await cookies();
    const headers = new Headers();

    // Add all session-related cookies
    const sessionDataCookie = cookieStore.get(
      "__Secure-better-auth.session_data"
    );
    const sessionTokenCookie = cookieStore.get(
      "__Secure-better-auth.session_token"
    );
    const nonSecureDataCookie = cookieStore.get("better-auth.session_data");
    const nonSecureTokenCookie = cookieStore.get("better-auth.session_token");

    if (sessionDataCookie?.value) {
      headers.append(
        "cookie",
        `__Secure-better-auth.session_data=${sessionDataCookie.value}`
      );
    }
    if (sessionTokenCookie?.value) {
      headers.append(
        "cookie",
        `__Secure-better-auth.session_token=${sessionTokenCookie.value}`
      );
    }
    if (nonSecureDataCookie?.value) {
      headers.append(
        "cookie",
        `better-auth.session_data=${nonSecureDataCookie.value}`
      );
    }
    if (nonSecureTokenCookie?.value) {
      headers.append(
        "cookie",
        `better-auth.session_token=${nonSecureTokenCookie.value}`
      );
    }

    // Update user profile via Better Auth with session headers
    await auth.api.updateUser({
      body: {
        name: validatedData.name,
      },
      headers: headers,
    });

    console.log("✅ Profile updated successfully");
    revalidatePath("/settings");
    return { success: true, message: "Profile updated successfully" };
  } catch (error: any) {
    console.error("❌ Profile update error:", error);
    return {
      success: false,
      message: error?.message || "Failed to update profile",
    };
  }
}

export async function updatePreferences(data: PreferencesData) {
  try {
    // Validate input data
    const validatedData = validatePreferences(data);

    const session = await getSessionWithCookies();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    // Upsert user preferences
    await db
      .insert(userPreferences)
      .values({
        userId: session.user.id,
        nativeLanguage: validatedData.nativeLanguage,
        targetLanguage: validatedData.targetLanguage,
        dailyGoal: validatedData.dailyGoal,
        ttsVoice: validatedData.ttsVoice,
        emailNotifications: validatedData.emailNotifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          nativeLanguage: validatedData.nativeLanguage,
          targetLanguage: validatedData.targetLanguage,
          dailyGoal: validatedData.dailyGoal,
          ttsVoice: validatedData.ttsVoice,
          emailNotifications: validatedData.emailNotifications,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/settings");
    return { success: true, message: "Preferences updated successfully" };
  } catch (error: any) {
    console.error("Preferences update error:", error);
    return {
      success: false,
      message: error?.message || "Failed to update preferences",
    };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  try {
    // Validate password data
    const validatedData = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword: newPassword, // For validation purposes
    });

    const session = await getSessionWithCookies();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    // Change password via Better Auth
    await auth.api.changePassword({
      body: {
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
      },
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error: any) {
    console.error("Password change error:", error);
    return {
      success: false,
      message: error?.message || "Failed to change password",
    };
  }
}

export async function getUserPreferences() {
  try {
    const session = await getSessionWithCookies();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    return {
      success: true,
      preferences: preferences[0] || null,
    };
  } catch (error: any) {
    console.error("Get preferences error:", error);
    return {
      success: false,
      message: error?.message || "Failed to get preferences",
    };
  }
}

export async function getUserProfile() {
  try {
    console.log("🔍 Server action: getUserProfile called");

    const session = await getSessionWithCookies();
    if (!session?.user?.id) {
      console.log("❌ No session found in getUserProfile");
      return { success: false, message: "Not authenticated" };
    }

    console.log(
      "✅ User profile loaded:",
      session.user.name,
      session.user.email
    );

    return {
      success: true,
      profile: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    };
  } catch (error: any) {
    console.error("❌ Get profile error:", error);
    return {
      success: false,
      message: error?.message || "Failed to get profile",
    };
  }
}
