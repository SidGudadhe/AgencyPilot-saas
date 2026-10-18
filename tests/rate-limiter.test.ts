import {
  checkSlidingWindowRateLimit,
  recordFailedAttempt,
  isLockedOut,
  resetRateLimit,
  getProgressiveDelayMs,
  getClientIp,
} from "../src/lib/rate-limiter";

describe("Defensive Rate Limiter & Security Engine", () => {
  beforeEach(() => {
    // Reset test keys before each test
    resetRateLimit("test-ip-1");
    resetRateLimit("test-email-1@example.com");
  });

  describe("Sliding Window Burst Protection", () => {
    test("allows requests up to the specified limit and blocks excess requests", () => {
      const key = "burst_test_" + Date.now();
      const limit = 5;
      const windowMs = 5000;

      for (let i = 0; i < limit; i++) {
        const res = checkSlidingWindowRateLimit(key, limit, windowMs);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(limit - (i + 1));
      }

      // The 6th request must be blocked
      const blockedRes = checkSlidingWindowRateLimit(key, limit, windowMs);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe("Progressive Account Lockout (5 Failed Attempts = 15 Min Lockout)", () => {
    test("tracks consecutive failed attempts and locks out on 5th attempt", () => {
      const key = "test-email-1@example.com";

      // Attempts 1 to 4 should NOT be locked
      for (let i = 1; i <= 4; i++) {
        const status = recordFailedAttempt(key, 5, 15 * 60 * 1000);
        expect(status.isLocked).toBe(false);
        expect(status.totalAttempts).toBe(i);
        expect(status.remainingAttempts).toBe(5 - i);
      }

      // Pre-check before 5th attempt: still not locked
      const preCheck = isLockedOut(key, 5);
      expect(preCheck.isLocked).toBe(false);
      expect(preCheck.remainingAttempts).toBe(1);

      // 5th attempt triggers lockout
      const lockStatus = recordFailedAttempt(key, 5, 15 * 60 * 1000);
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.remainingAttempts).toBe(0);
      expect(lockStatus.remainingSeconds).toBeGreaterThan(800); // ~900s for 15 mins

      // Subsequent check confirms active lockout
      const lockedCheck = isLockedOut(key, 5);
      expect(lockedCheck.isLocked).toBe(true);
      expect(lockedCheck.remainingAttempts).toBe(0);
      expect(lockedCheck.remainingSeconds).toBeGreaterThan(0);
    });

    test("resets attempts and lockout upon successful authentication", () => {
      const key = "test-ip-1";

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(key, 5, 15 * 60 * 1000);
      }
      expect(isLockedOut(key, 5).isLocked).toBe(true);

      // Successful login resets
      resetRateLimit(key);

      const afterReset = isLockedOut(key, 5);
      expect(afterReset.isLocked).toBe(false);
      expect(afterReset.remainingAttempts).toBe(5);
      expect(afterReset.totalAttempts).toBe(0);
    });
  });

  describe("Progressive Delay (Exponential Backoff Against Timing Attacks)", () => {
    test("returns increasing delays as failed attempts increase", () => {
      expect(getProgressiveDelayMs(1)).toBe(0);
      expect(getProgressiveDelayMs(2)).toBe(250);
      expect(getProgressiveDelayMs(3)).toBe(600);
      expect(getProgressiveDelayMs(4)).toBe(1200);
      expect(getProgressiveDelayMs(5)).toBe(2000);
    });
  });

  describe("Client IP Extraction & Proxy Sanitization", () => {
    test("prioritizes Cloudflare cf-connecting-ip header", () => {
      const headers = {
        "cf-connecting-ip": "203.0.113.195",
        "x-forwarded-for": "198.51.100.1, 192.0.2.1",
        "x-real-ip": "198.51.100.1",
      };
      expect(getClientIp(headers)).toBe("203.0.113.195");
    });

    test("extracts first IP from comma-separated x-forwarded-for header", () => {
      const headers = {
        "x-forwarded-for": "203.0.113.42, 10.0.0.1, 172.16.0.1",
      };
      expect(getClientIp(headers)).toBe("203.0.113.42");
    });

    test("falls back to 127.0.0.1 when no headers are present", () => {
      expect(getClientIp({})).toBe("127.0.0.1");
    });
  });
});
