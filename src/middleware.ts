import { NextRequest, NextResponse } from "next/server";
import { getRateLimiterForPath } from "@/lib/rate-limiter";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting for API endpoints (unless disabled in development)
  if (
    pathname.startsWith("/api/") &&
    process.env.DISABLE_RATE_LIMITING !== "true"
  ) {
    try {
      const rateLimiter = getRateLimiterForPath(pathname);
      const rateLimitResult = await rateLimiter.middleware()(request);

      if (rateLimitResult) {
        console.log(`🚫 Rate limit exceeded for ${pathname}`);
        return rateLimitResult;
      }

      // Log API requests for debugging (but not too frequently)
      if (Math.random() < 0.1) {
        // Only log 10% of requests to avoid spam
        console.log(`✅ API request: ${pathname}`);
      }
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Continue without rate limiting if there's an error
    }
  }

  // Dashboard protection - check for session cookies
  if (pathname.startsWith("/dashboard")) {
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
