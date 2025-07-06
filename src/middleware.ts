import { NextRequest, NextResponse } from "next/server";
import { getRateLimiterForPath } from "@/lib/rate-limiter";

export async function middleware(request: NextRequest) {
  console.log(`Middleware triggered for path: ${request.nextUrl.pathname}`);

  // Apply rate limiting for API endpoints
  if (request.nextUrl.pathname.startsWith("/api/")) {
    try {
      const rateLimiter = getRateLimiterForPath(request.nextUrl.pathname);
      const rateLimitResult = await rateLimiter.middleware()(request);

      if (rateLimitResult) {
        console.log(`Rate limit exceeded for ${request.nextUrl.pathname}`);
        return rateLimitResult;
      }
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Continue without rate limiting if there's an error
    }
  }

  // Dashboard protection - check for session cookies
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("Checking session for /dashboard");

    // Check for Better Auth session cookies
    const sessionDataCookie =
      request.cookies.get("__Secure-better-auth.session_data") ||
      request.cookies.get("better-auth.session_data");
    const sessionTokenCookie =
      request.cookies.get("__Secure-better-auth.session_token") ||
      request.cookies.get("better-auth.session_token");

    console.log(
      "Session cookies found:",
      sessionDataCookie ? "Data cookie present" : "No data cookie",
      sessionTokenCookie ? "Token cookie present" : "No token cookie"
    );

    if (!sessionDataCookie && !sessionTokenCookie) {
      console.log("No session cookies, redirecting to /login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.log("Session cookies exist, allowing access to /dashboard");
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
