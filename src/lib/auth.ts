import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findLocalUserByEmail, findLocalUserById } from "@/lib/local-store";
import {
  isLockedOut,
  recordFailedAttempt,
  resetRateLimit,
  getClientIp,
  getProgressiveDelayMs,
} from "@/lib/rate-limiter";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const clientIp = getClientIp(req?.headers || {});
        const ipKey = `auth_ip:${clientIp}`;
        const emailKey = `auth_email:${email}`;

        // 1. Layer 3 Pre-Check: Is IP or Account in active 15-minute security lockout?
        const ipStatus = isLockedOut(ipKey, 5);
        const emailStatus = isLockedOut(emailKey, 5);

        if (ipStatus.isLocked || emailStatus.isLocked) {
          const activeStatus = emailStatus.isLocked ? emailStatus : ipStatus;
          const minutesLeft = Math.max(1, Math.ceil(activeStatus.remainingSeconds / 60));
          throw new Error(
            `Too many login attempts. Account temporarily locked for security. Please try again after ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`
          );
        }

        // Defensive Handler for failed authentication
        const handleAuthFailure = async (): Promise<never> => {
          const failedIp = recordFailedAttempt(ipKey, 5, 15 * 60 * 1000);
          const failedEmail = recordFailedAttempt(emailKey, 5, 15 * 60 * 1000);
          const worstStatus = failedEmail.isLocked ? failedEmail : failedIp;

          // Progressive delay against automated timing bots
          const delayMs = getProgressiveDelayMs(worstStatus.totalAttempts);
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          if (worstStatus.isLocked) {
            throw new Error(
              "Too many login attempts. Account temporarily locked for security. Please try again after 15 minutes."
            );
          }

          if (worstStatus.remainingAttempts <= 2) {
            throw new Error(
              `Invalid email or password. Warning: ${worstStatus.remainingAttempts} attempt${worstStatus.remainingAttempts > 1 ? "s" : ""} remaining before 15-minute security lockout.`
            );
          }

          throw new Error("Invalid email or password");
        };

        // 2. Try Prisma DB if available
        let user: any = null;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: {
              memberships: {
                include: {
                  workspace: true,
                },
                orderBy: {
                  joinedAt: "asc",
                },
              },
            },
          });
        } catch (dbErr: unknown) {
          console.warn(
            "Database unavailable during login, falling back to local store:",
            (dbErr as Error).message
          );
        }

        if (user && user.passwordHash) {
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (isValid) {
            resetRateLimit(ipKey);
            resetRateLimit(emailKey);
            const defaultWorkspace = user.memberships[0]?.workspace;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              activeWorkspaceId: defaultWorkspace?.id || null,
            };
          } else {
            return await handleAuthFailure();
          }
        }

        // 3. High-availability local store fallback
        const localUser = findLocalUserByEmail(email);
        if (localUser && localUser.passwordHash) {
          const isValid = await bcrypt.compare(credentials.password, localUser.passwordHash);
          if (isValid) {
            resetRateLimit(ipKey);
            resetRateLimit(emailKey);
            return {
              id: localUser.id,
              email: localUser.email,
              name: localUser.name,
              image: null,
              activeWorkspaceId: localUser.workspace.id,
            };
          } else {
            return await handleAuthFailure();
          }
        }

        // If user not found in DB or local store
        return await handleAuthFailure();
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.activeWorkspaceId = (user as unknown as { activeWorkspaceId?: string }).activeWorkspaceId;
      }

      // Allow updating workspace context and user profile dynamically via session update
      if (trigger === "update") {
        if (session?.activeWorkspaceId) {
          token.activeWorkspaceId = session.activeWorkspaceId;
        }
        if (session?.name) {
          token.name = session.name;
        } else if (session?.user?.name) {
          token.name = session.user.name;
        }
      }

      // Look up fresh user name from local store to guarantee persistent sync across sessions
      if (token.id) {
        const local = findLocalUserById(token.id as string);
        if (local?.name) {
          token.name = local.name;
        }
      } else if (token.email) {
        const local = findLocalUserByEmail(token.email as string);
        if (local?.name) {
          token.name = local.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const localUser =
          (token.id ? findLocalUserById(token.id as string) : null) ||
          (session.user.email ? findLocalUserByEmail(session.user.email) : null);
        if (localUser?.name) {
          session.user.name = localUser.name;
        } else if (token.name) {
          session.user.name = token.name as string;
        }
        (session.user as unknown as { activeWorkspaceId?: string }).activeWorkspaceId =
          token.activeWorkspaceId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "default-dev-secret-agencypilot-super-secure-key-32chars",
};

/**
 * Hash password securely with bcrypt salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
