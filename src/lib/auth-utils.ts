import { NextRequest } from "next/server";

/**
 * Extract session token from cookies for rate limiting and security purposes
 * @param req - NextRequest object
 * @returns string | null - Session token or null if not present
 */
export function extractSessionToken(req: NextRequest): string | null {
  // Try Better Auth secure and non-secure session cookies
  const sessionToken =
    req.cookies.get("__Secure-better-auth.session_token")?.value ||
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("better-auth.session-token")?.value ||
    req.cookies.get("session-token")?.value ||
    req.cookies.get("auth-session")?.value ||
    req.cookies.get("session")?.value ||
    null;
  return sessionToken;
}

/**
 * Extract IP address from request, handling various proxy scenarios
 * @param req - NextRequest object
 * @returns string - IP address
 */
export function extractIP(req: NextRequest): string {
  // Check for forwarded IP headers (common in proxy setups)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to direct IP (NextRequest doesn't have ip property)
  return "unknown";
}

/**
 * Generate a unique identifier for rate limiting based on request
 * @param req - NextRequest object
 * @returns string - Unique identifier
 */
export function generateRateLimitKey(req: NextRequest): string {
  const ip = extractIP(req);
  const sessionToken = extractSessionToken(req) || "anonymous";
  const path = req.nextUrl.pathname;
  return `${ip}:${sessionToken}:${path}`;
}
