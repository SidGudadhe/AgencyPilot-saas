# AgencyPilot Production Security & Cloudflare WAF Guide

This document outlines the multi-layered defense architecture protecting AgencyPilot SaaS against brute-force attacks, credential stuffing, botnets, and denial-of-service (DoS) attempts.

---

## 1. Multi-Layer Defense Architecture

```
[Attacker / Automated Bot]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 1: Edge & Cloudflare WAF (DNS / Proxy)          │
│  - Blocks malicious botnets & automated scanners       │
│  - Rate limits HTTP requests before touching the server│
│  - Cloudflare Turnstile / Managed Challenge            │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 2: Next.js Security Middleware                  │
│  - Enforces OWASP security response headers            │
│  - IP-based burst rate limiting on auth endpoints       │
│  - Drops flooding attempts with HTTP 429 Too Many Req  │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: Progressive Lockout & Backoff Delay          │
│  - Max 5 failed attempts per IP / per Account          │
│  - 5th failed attempt triggers 15-minute hard lockout  │
│  - Exponential backoff delay (250ms - 2000ms)          │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: bcrypt Password Verification                 │
│  - ONLY executed if rate limit & lockout checks pass   │
│  - Completely shields server CPU from hash exhaustion  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1 Setup: Cloudflare WAF & Rate Limiting Rules

When you connect your production domain (e.g. `app.yourdomain.com`) to Cloudflare:

### Rule 1: Auth Endpoint Rate Limiter
- **Location:** Cloudflare Dashboard → Security → WAF → Rate Limiting Rules
- **Rule Name:** `Protect Login and Auth Endpoints`
- **When incoming requests match:**
  - `URI Path` starts with `/api/auth/`
- **Rate:** 10 requests per 10 seconds per IP address
- **Action:** Block or Managed Challenge
- **Duration:** 10 minutes

### Rule 2: Registration Abuse Prevention
- **Location:** Cloudflare Dashboard → Security → WAF → Rate Limiting Rules
- **Rule Name:** `Protect Registration Endpoint`
- **When incoming requests match:**
  - `URI Path` equals `/api/auth/register`
- **Rate:** 5 requests per 1 minute per IP address
- **Action:** Block or Managed Challenge
- **Duration:** 30 minutes

### Rule 3: Automated Bot Management
- **Location:** Cloudflare Dashboard → Security → Bots
- Enable **Bot Fight Mode** or **Super Bot Fight Mode** (Challenges automated headless browsers and scrapers).

---

## 3. Layer 2: Next.js Global Security Middleware (`src/middleware.ts`)

The application automatically enforces:
- `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-XSS-Protection: 1; mode=block`
- Sliding-window burst check on `/api/auth/*` dropping flood attacks with HTTP 429.

---

## 4. Layer 3 & 4: Progressive Lockout Engine (`src/lib/rate-limiter.ts`)

1. **Lockout Threshold:** 5 consecutive failed passwords.
2. **Lockout Duration:** 15 minutes (900 seconds).
3. **Dual-Key Tracking:** Tracks both the Client IP (`auth_ip:<ip>`) and the target Email (`auth_email:<email>`).
   - If an attacker rotates IPs to target one user: **Blocked by email key.**
   - If an attacker attacks multiple users from one IP: **Blocked by IP key.**
4. **CPU Shield:** If locked out, `bcrypt.compare` is skipped entirely, keeping CPU usage near 0%.
5. **Legitimate User Safety:** Successful login immediately resets the attempt counter.
