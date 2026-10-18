import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkSlidingWindowRateLimit, getClientIp } from "@/lib/rate-limiter";

/**
 * Next.js Edge & Global Security Middleware
 *
 * Layer 1 & 2 Defense:
 * - Injects standard OWASP security response headers
 * - Enforces IP-based burst rate limiting on auth & registration endpoints
 * - Drops high-velocity brute-force floods with HTTP 429 Too Many Requests
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request.headers);

  // 1. Layer 2 Rate Limiter on Authentication Endpoints (/api/auth/*)
  if (pathname.startsWith("/api/auth/callback/credentials") || pathname.startsWith("/api/auth/register")) {
    // Limit to max 20 requests per 10 seconds per IP for sensitive auth paths
    const rateLimit = checkSlidingWindowRateLimit(`auth_burst_${ip}`, 20, 10000);

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many authentication requests. High request velocity detected. Please slow down and try again.",
          retryAfter: rateLimit.resetSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.resetSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetSeconds),
          },
        }
      );
    }
  }

  // 2. Pass request and attach global defense-in-depth security headers
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
