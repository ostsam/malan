import { NextResponse } from "next/server";

export async function GET() {
  const baseURL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return NextResponse.json({
    baseURL,
    githubRedirectURI: `${baseURL}/api/auth/callback/github`,
    googleRedirectURI: `${baseURL}/api/auth/callback/google`,
    hasGitHubClientId: !!process.env.GITHUB_CLIENT_ID,
    hasGitHubClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    environment: process.env.NODE_ENV,
  });
}
