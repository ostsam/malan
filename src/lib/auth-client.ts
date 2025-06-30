import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
    // For client-side, use the current window origin
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // For server-side, Vercel provides the deployment URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    /// Fallback for local development
    return 'http://localhost:3000';
};

const getTrustedOrigins = () => {
    const origins = ['http://localhost:3000'];
    
    // Trust the current deployment URL on Vercel (for both preview and production)
    if (process.env.VERCEL_URL) {
      origins.push(`https://${process.env.VERCEL_URL}`);
    }

    // Also trust the main production URL, especially for preview deployments
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }

    // Return a unique list of origins
    return [...new Set(origins)];
};
  
export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    trustedOrigins: getTrustedOrigins(),
});

export const { signIn, signUp, useSession, signOut } = authClient;