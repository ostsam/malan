import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Handle session check for /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url), {
        headers: CORS_HEADERS,
      });
    }
  }

  return response;
  console.log(`Middleware triggered for path: ${request.nextUrl.pathname}`);

  // This part will run if pathname is /dashboard (due to matcher)
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
  matcher: [
    '/',
    '/api/:path*',
    '/dashboard/:path*',
  ],
};