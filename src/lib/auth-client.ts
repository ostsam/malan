import { createAuthClient } from "better-auth/react";

// For Vercel deployments, NEXT_PUBLIC_VERCEL_URL is automatically provided
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : null;

export const authClient = createAuthClient({
  baseURL: 
    // In the browser, use current origin
    typeof window !== 'undefined' 
      ? window.location.origin
      // In server-side context, use Vercel URL if available, otherwise fallback to localhost
      : vercelUrl || 'http://localhost:3000'
});
export const { signIn, signUp, useSession, signOut } = authClient;