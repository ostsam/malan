import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const googleSignIn = async () => {
  try {
    // This will redirect to Google's OAuth page
    await authClient.signIn.social({
      provider: "google",
    });
    // If we reach here, there was an error with the redirect
    throw new Error("Failed to redirect to Google");
  } catch (error) {
    // Only throw if it's not a redirect (which is expected)
    if (error instanceof Error && error.message.includes("redirect")) {
      // This is expected - the OAuth flow is working
      return;
    }
    console.error("Google sign in error:", error);
    throw error;
  }
};

export const gitHubSignIn = async () => {
  try {
    // This will redirect to GitHub's OAuth page
    await authClient.signIn.social({
      provider: "github",
    });
    // If we reach here, there was an error with the redirect
    throw new Error("Failed to redirect to GitHub");
  } catch (error) {
    // Only throw if it's not a redirect (which is expected)
    if (error instanceof Error && error.message.includes("redirect")) {
      // This is expected - the OAuth flow is working
      return;
    }
    console.error("GitHub sign in error:", error);
    throw error;
  }
};

export const { signIn, signUp, useSession, signOut } = authClient;
