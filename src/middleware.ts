import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getRateLimiterForPath } from "@/lib/rate-limiter";

export async function middleware(request: NextRequest) {
  console.log(`Middleware triggered for path: ${request.nextUrl.pathname}`);

  // Apply rate limiting for API endpoints
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const rateLimiter = getRateLimiterForPath(request.nextUrl.pathname);
    const rateLimitResult = await rateLimiter.middleware()(request);

    if (rateLimitResult) {
      console.log(`Rate limit exceeded for ${request.nextUrl.pathname}`);
      return rateLimitResult;
    }
  }

  // This part will run if pathname is /dashboard (due to matcher)
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("Checking session for /dashboard");
    const sessionCookie = getSessionCookie(request);
    console.log(
      "Session cookie found:",
      sessionCookie
        ? JSON.stringify(sessionCookie).substring(0, 100) + "..."
        : "No session cookie"
    );

    if (!sessionCookie) {
      console.log("No session cookie, redirecting to /login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.log("Session cookie exists, allowing access to /dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/api/:path*", // Add API routes to middleware
  ],
};
