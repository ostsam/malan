import { NextRequest } from "next/server";
import { auth } from "@/app/api/auth/[...all]/auth";

/**
 * Extract user ID from request for rate limiting and security purposes
 * @param req - NextRequest object
 * @returns Promise<string | null> - User ID or null if not authenticated
 */
export async function extractUserId(req: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user?.id || null;
  } catch (error) {
    console.error("Error extracting user ID:", error);
    return null;
  }
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
 * @param userId - Optional user ID
 * @returns string - Unique identifier
 */
export function generateRateLimitKey(
  req: NextRequest,
  userId?: string | null
): string {
  const ip = extractIP(req);
  const user = userId || "anonymous";
  const path = req.nextUrl.pathname;

  return `${ip}:${user}:${path}`;
}

/**
 * Enhanced rate limiting key generator that includes user ID
 * @param req - NextRequest object
 * @returns Promise<string> - Rate limiting key
 */
export async function generateEnhancedRateLimitKey(
  req: NextRequest
): Promise<string> {
  const userId = await extractUserId(req);
  return generateRateLimitKey(req, userId);
}
