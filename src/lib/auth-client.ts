import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }
    return 'http://localhost:3000';
  };

const getTrustedOrigins = () => {
    const origins = ['http://localhost:3000'];
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      origins.push(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
    }
    if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
      origins.push(`https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    return [...new Set(origins)];
};
  
export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    trustedOrigins: getTrustedOrigins(),
});
export const { signIn, signUp, useSession, signOut } = authClient;