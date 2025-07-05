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
  } catch (error: any) {
    // Check if it's an email verification error
    if (
      error?.status === 403 ||
      error?.message?.includes("verify") ||
      error?.message?.includes("verification")
    ) {
      return {
        success: false,
        message: "Please verify your email address before signing in",
      };
    }

    return {
      success: false,
      message: error?.message || "Signin error occurred",
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
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Signup error occurred",
    };
  }
};
