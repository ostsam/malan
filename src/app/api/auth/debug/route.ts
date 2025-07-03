import { NextResponse } from "next/server";

const getBaseURL = () => {
  // Use server-side environment variable for production URL
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  // Use custom domain if available
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // Fallback to Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
};

export async function GET() {
  const baseURL = getBaseURL();

  return NextResponse.json({
    baseURL,
    githubRedirectURI: `${baseURL}/api/auth/callback/github`,
    googleRedirectURI: `${baseURL}/api/auth/callback/google`,
    hasGitHubClientId: !!process.env.GITHUB_CLIENT_ID,
    hasGitHubClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    environment: process.env.NODE_ENV,
    appUrl: process.env.APP_URL,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
}
