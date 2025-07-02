import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const googleSignIn = async () => {
  try {
    // This will redirect to Google's OAuth page
    await authClient.signIn.social({
      provider: "google",
    });
    // If we reach here, there was an error
    return { success: false, error: "Failed to redirect to Google" };
  } catch (error) {
    console.error("Google sign in error:", error);
    return { success: false, error };
  }
};

export const gitHubSignIn = async () => {
  try {
    // This will redirect to GitHub's OAuth page
    await authClient.signIn.social({
      provider: "github",
    });
    // If we reach here, there was an error
    return { success: false, error: "Failed to redirect to GitHub" };
  } catch (error) {
    console.error("GitHub sign in error:", error);
    return { success: false, error };
  }
};

export const { signIn, signUp, useSession, signOut } = authClient;
