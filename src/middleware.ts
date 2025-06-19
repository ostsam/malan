import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  console.log(`Middleware triggered for path: ${request.nextUrl.pathname}`);

  if (request.nextUrl.pathname === "/") {
    console.log("Redirecting from / to /dashboard");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // This part will run if pathname is /dashboard (due to matcher and the / redirect)
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("Checking session for /dashboard");
    const sessionCookie = getSessionCookie(request);
    console.log("Session cookie found:", sessionCookie ? JSON.stringify(sessionCookie).substring(0, 100) + '...' : 'No session cookie');

    if (!sessionCookie) {
      console.log("No session cookie, redirecting to /login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.log("Session cookie exists, allowing access to /dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"], // Updated matcher to include sub-paths of dashboard
};