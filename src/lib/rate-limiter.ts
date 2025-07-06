import { NextRequest, NextResponse } from "next/server";
import { extractIP, generateRateLimitKey } from "./auth-utils";

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string | Promise<string>; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  message?: string; // Custom error message
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    const defaults = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests default
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: "Too many requests, please try again later.",
    };
    this.config = { ...defaults, ...config };
  }

  private async generateKey(req: NextRequest): Promise<string> {
    if (this.config.keyGenerator) {
      const result = this.config.keyGenerator(req);
      return typeof result === "string" ? result : await result;
    }
    // Default key generation using session token and IP
    return generateRateLimitKey(req);
  }

  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record) {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return false;
    }

    if (now > record.resetTime) {
      // Window expired, reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return false;
    }

    // Increment count
    record.count++;
    rateLimitStore.set(key, record);

    return record.count > this.config.maxRequests;
  }

  private getRateLimitHeaders(key: string): Record<string, string> {
    const record = rateLimitStore.get(key);
    if (!record) {
      return {
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": (this.config.maxRequests - 1).toString(),
        "X-RateLimit-Reset": new Date(
          Date.now() + this.config.windowMs
        ).toISOString(),
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - record.count);
    return {
      "X-RateLimit-Limit": this.config.maxRequests.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
    };
  }

  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const key = await this.generateKey(req);
      const isLimited = this.isRateLimited(key);

      if (isLimited) {
        const response = NextResponse.json(
          { error: this.config.message },
          { status: 429 }
        );

        // Add rate limit headers
        Object.entries(this.getRateLimitHeaders(key)).forEach(
          ([key, value]) => {
            response.headers.set(key, value);
          }
        );

        return response;
      }

      // Add rate limit headers to successful requests
      const response = NextResponse.next();
      Object.entries(this.getRateLimitHeaders(key)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return null; // Continue to next middleware
    };
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Strict limits for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 attempts per 15 minutes (increased by 10x)
    message: "Too many authentication attempts. Please try again later.",
    keyGenerator: (req) => {
      const ip = extractIP(req);
      return `auth:${ip}`;
    },
  }),

  // Much higher limits for chat endpoints (normal usage)
  chat: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 600, // 600 requests per minute (increased by 10x)
    message: "Too many chat requests. Please slow down.",
    keyGenerator: (req) => {
      return generateRateLimitKey(req);
    },
  }),

  // Higher limits for dictionary lookups (word clicks)
  dictionary: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute (increased by 10x)
    message: "Too many dictionary requests. Please slow down.",
    keyGenerator: (req) => {
      return generateRateLimitKey(req);
    },
  }),

  // High limits for stats (frequently accessed)
  stats: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1200, // 1200 requests per minute (increased by 10x)
    message: "Too many stats requests. Please slow down.",
    keyGenerator: (req) => {
      return generateRateLimitKey(req);
    },
  }),

  // Higher limits for wordlist operations
  wordlist: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute (increased by 10x)
    message: "Too many wordlist operations. Please slow down.",
    keyGenerator: (req) => {
      return generateRateLimitKey(req);
    },
  }),

  // General API protection (higher limits)
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2000, // 2000 requests per minute (increased by 10x)
    message: "Too many API requests. Please slow down.",
    keyGenerator: (req) => {
      return generateRateLimitKey(req);
    },
  }),
};

// Clean up expired entries periodically (every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

// Export utility functions
export function getRateLimiterForPath(pathname: string): RateLimiter {
  if (pathname.startsWith("/api/auth")) {
    return rateLimiters.auth;
  }
  if (pathname.startsWith("/api/chat")) {
    return rateLimiters.chat;
  }
  if (pathname.startsWith("/api/dict")) {
    return rateLimiters.dictionary;
  }
  if (pathname.startsWith("/api/stats")) {
    return rateLimiters.stats;
  }
  if (pathname.startsWith("/api/wordlist")) {
    return rateLimiters.wordlist;
  }
  if (pathname.startsWith("/api/")) {
    return rateLimiters.api;
  }
  return rateLimiters.api; // Default fallback
}
 