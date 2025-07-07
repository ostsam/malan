"use server";
import { auth } from "@/app/api/auth/[...all]/auth";

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
    return {
      success: true,
      message: "User signed in successfully",
    };
  } catch (error: unknown) {
    // Check if it's an email verification error
    if (
      error instanceof Error &&
      ((error as Error & { status?: number })?.status === 403 ||
        error.message?.includes("verify") ||
        error.message?.includes("verification"))
    ) {
      return {
        success: false,
        message: "Please verify your email address before signing in",
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Signin error occurred";
    return {
      success: false,
      message: errorMessage,
    };
  }
};

export const signUp = async (
  email: string,
  username: string,
  password: string
) => {
  try {
    await auth.api.signUpEmail({
      body: {
        email,
        name: username,
        password,
      },
    });
    return {
      success: true,
      message: "User signed up successfully",
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Signup error occurred";
    return {
      success: false,
      message: errorMessage,
    };
  }
};
