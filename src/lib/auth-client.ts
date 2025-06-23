import { createAuthClient } from "better-auth/react";

// Determine the base URL based on the environment
const getBaseURL = () => {
  // In the browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // For server-side, use the environment variable or default to the production URL
  return process.env.BETTER_AUTH_URL || 'https://www.malan.vercel.app';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL()
});

const { signIn, signUp, useSession, signOut } = authClient;
export { signIn, signUp, useSession, signOut };