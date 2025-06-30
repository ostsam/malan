import { createAuthClient } from "better-auth/react";
  
export const authClient = createAuthClient();

export const googleSignIn = async () => {
    const data = await authClient.signIn.social({
        provider: "google"
    })
}

export const gitHubSignIn = async () => {
    const data = await authClient.signIn.social({
        provider: "github"
    })
}

export const { signIn, signUp, useSession, signOut } = authClient;