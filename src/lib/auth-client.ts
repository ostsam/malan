import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
const { signIn, signUp, useSession, signOut } = authClient;
export { signIn, signUp, useSession, signOut };