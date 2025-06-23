import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const allowedOrigins = [
  'http://localhost:3000',
  'https://malan.vercel.app',
  'https://www.malan.vercel.app'
];

const CORS_HEADERS = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
});


export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const corsHeaders = CORS_HEADERS(origin);

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // Handle session check for /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          redirectResponse.headers.set(key, value);
        }
      });
      return redirectResponse;
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