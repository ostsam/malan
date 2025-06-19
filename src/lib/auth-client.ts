import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL
});

// It's generally better to use the same instance for all operations if they share configuration.
// If signIn, signUp, useSession are methods of the client instance, you can export them like this:
// export const { signIn, signUp, useSession, signOut } = authClient;
// However, since logout.tsx already uses authClient.signOut(), we'll keep it simple
// and ensure authClient is correctly configured. The main change is the env variable prefix.

// For clarity and to ensure all parts of better-auth use the configured client if possible:
const { signIn, signUp, useSession, signOut } = authClient;
export { signIn, signUp, useSession, signOut };