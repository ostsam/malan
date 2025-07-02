import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const googleSignIn = async () => {
  try {
    const data = await authClient.signIn.social({
      provider: "google",
    });
    return { success: true, data };
  } catch (error) {
    console.error("Google sign in error:", error);
    return { success: false, error };
  }
};

export const gitHubSignIn = async () => {
  try {
    const data = await authClient.signIn.social({
      provider: "github",
    });
    return { success: true, data };
  } catch (error) {
    console.error("GitHub sign in error:", error);
    return { success: false, error };
  }
};

export const { signIn, signUp, useSession, signOut } = authClient;
