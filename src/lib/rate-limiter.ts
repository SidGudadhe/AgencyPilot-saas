/**
 * High-Performance Defensive Rate Limiter & Progressive Lockout Engine
 *
 * Implements Multi-Layered Protection:
 * 1. Sliding Window Burst Protection (Middleware / API level)
 * 2. IP & Account-level Progressive Lockout (5 failed attempts = 15 min block)
 * 3. CPU Protection (Shields bcrypt.compare from CPU exhaustion by halting before hash check)
 * 4. Progressive Delay (Exponential backoff against automated timing bots)
 * 5. Cloudflare & Proxy IP Extraction (cf-connecting-ip, x-forwarded-for)
 */

export interface RateLimitStatus {
  isLocked: boolean;
  remainingAttempts: number;
  totalAttempts: number;
  remainingSeconds: number;
  lockedUntil: number | null;
}

export interface SlidingWindowResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

interface SlidingWindowRecord {
  timestamps: number[];
}

// Global in-memory storage maps
const attemptStore = new Map<string, AttemptRecord>();
const windowStore = new Map<string, SlidingWindowRecord>();

// Cleanup stale records periodically to avoid memory growth
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCleanup = Date.now();

function cleanupStaleRecords(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  // Cleanup failed attempt records older than 1 hour (unless currently locked)
  attemptStore.forEach((record, key) => {
    if (record.lockedUntil && record.lockedUntil > now) return;
    if (now - record.lastAttemptAt > 60 * 60 * 1000) {
      attemptStore.delete(key);
    }
  });

  // Cleanup sliding window records older than 5 minutes
  windowStore.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < 5 * 60 * 1000);
    if (record.timestamps.length === 0) {
      windowStore.delete(key);
    }
  });
}

/**
 * Checks if a given key (IP or Email identifier) is currently locked out.
 */
export function isLockedOut(key: string, maxAttempts = 5): RateLimitStatus {
  cleanupStaleRecords();
  const record = attemptStore.get(key);
  const now = Date.now();

  if (!record) {
    return {
      isLocked: false,
      remainingAttempts: maxAttempts,
      totalAttempts: 0,
      remainingSeconds: 0,
      lockedUntil: null,
    };
  }

  // Check if active lockout exists
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingAttempts: 0,
      totalAttempts: record.count,
      remainingSeconds,
      lockedUntil: record.lockedUntil,
    };
  }

  // If lockout expired, reset the counter
  if (record.lockedUntil && record.lockedUntil <= now) {
    attemptStore.delete(key);
    return {
      isLocked: false,
      remainingAttempts: maxAttempts,
      totalAttempts: 0,
      remainingSeconds: 0,
      lockedUntil: null,
    };
  }

  const remaining = Math.max(0, maxAttempts - record.count);
  return {
    isLocked: false,
    remainingAttempts: remaining,
    totalAttempts: record.count,
    remainingSeconds: 0,
    lockedUntil: null,
  };
}

/**
 * Records a failed authentication attempt.
 * If total attempts reaches maxAttempts, locks the key for lockoutDurationMs.
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  lockoutDurationMs = 15 * 60 * 1000
): RateLimitStatus {
  cleanupStaleRecords();
  const now = Date.now();
  let record = attemptStore.get(key);

  if (!record) {
    record = {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      lockedUntil: null,
    };
  } else {
    // If the attempts were made long ago (> 30 mins) and not locked, restart counter
    if (!record.lockedUntil && now - record.lastAttemptAt > 30 * 60 * 1000) {
      record.count = 1;
      record.firstAttemptAt = now;
    } else {
      record.count += 1;
    }
    record.lastAttemptAt = now;
  }

  // Check if lockout threshold reached
  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
    attemptStore.set(key, record);
    return {
      isLocked: true,
      remainingAttempts: 0,
      totalAttempts: record.count,
      remainingSeconds: Math.ceil(lockoutDurationMs / 1000),
      lockedUntil: record.lockedUntil,
    };
  }

  attemptStore.set(key, record);
  const remaining = Math.max(0, maxAttempts - record.count);

  return {
    isLocked: false,
    remainingAttempts: remaining,
    totalAttempts: record.count,
    remainingSeconds: 0,
    lockedUntil: null,
  };
}

/**
 * Resets the attempt counter and lockout for a key upon successful login.
 */
export function resetRateLimit(key: string): void {
  attemptStore.delete(key);
}

/**
 * Calculates progressive delay in milliseconds based on consecutive failed attempts.
 * Delays timing bots exponentially without overwhelming normal users.
 */
export function getProgressiveDelayMs(failedAttempts: number): number {
  switch (failedAttempts) {
    case 1:
      return 0;
    case 2:
      return 250;
    case 3:
      return 600;
    case 4:
      return 1200;
    default:
      return failedAttempts >= 5 ? 2000 : 0;
  }
}

/**
 * Sliding window rate limiter for general endpoint protection (e.g. middleware burst guard).
 */
export function checkSlidingWindowRateLimit(
  key: string,
  limit = 20,
  windowMs = 10000
): SlidingWindowResult {
  cleanupStaleRecords();
  const now = Date.now();
  let record = windowStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    windowStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = limit - record.timestamps.length;
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Extracts normalized client IP address from request headers.
 * Supports Cloudflare (cf-connecting-ip), AWS/Reverse Proxies (x-forwarded-for), and Nginx (x-real-ip).
 */
export function getClientIp(
  headers: Headers | Record<string, string | string[] | undefined>
): string {
  let cfConnectingIp: string | null = null;
  let xForwardedFor: string | null = null;
  let xRealIp: string | null = null;

  if (headers instanceof Headers) {
    cfConnectingIp = headers.get("cf-connecting-ip");
    xForwardedFor = headers.get("x-forwarded-for");
    xRealIp = headers.get("x-real-ip");
  } else {
    const cf = headers["cf-connecting-ip"];
    cfConnectingIp = Array.isArray(cf) ? cf[0] : cf || null;

    const xff = headers["x-forwarded-for"];
    xForwardedFor = Array.isArray(xff) ? xff[0] : xff || null;

    const xri = headers["x-real-ip"];
    xRealIp = Array.isArray(xri) ? xri[0] : xri || null;
  }

  // Cloudflare is the highest-trust edge header when behind Cloudflare proxy
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // x-forwarded-for can be a comma-separated list of client, proxy1, proxy2
  if (xForwardedFor && xForwardedFor.trim()) {
    const parts = xForwardedFor.split(",");
    const client = parts[0]?.trim();
    if (client) return client;
  }

  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return "127.0.0.1";
}
